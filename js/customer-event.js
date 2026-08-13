import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Keys and config
const SESSION_ID_KEY = "whtdfork.customerSessionId";
const MENU_OPEN_KEY = "whtdfork.menuOpenRecorded";
const PAGE_VIEW_KEY_PREFIX = "whtdfork.pageView:"; // prefix + page
const EVENT_COLLECTION = "customerEvents";
const DEFAULT_PAGE = "index";
const DEFAULT_SOURCE = "website";

function safeSessionStorageGet(key) {
    try {
        return window.sessionStorage.getItem(key);
    } catch (error) {
        console.error("// TRACKER sessionStorage read failed:", error);
        return null;
    }
}

function safeSessionStorageSet(key, value) {
    try {
        window.sessionStorage.setItem(key, value);
    } catch (error) {
        console.error("// TRACKER sessionStorage write failed:", error);
    }
}

function generateSessionId() {
    const existing = safeSessionStorageGet(SESSION_ID_KEY);
    if (existing) return existing;
    let id = null;
    try {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            id = crypto.randomUUID();
        }
    } catch (e) {
        // fallthrough
    }
    if (!id) {
        const randomPart = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        id = `${Date.now()}-${randomPart()}-${randomPart()}`;
    }
    safeSessionStorageSet(SESSION_ID_KEY, id);
    return id;
}

function buildBasePayload(eventType, extra = {}) {
    const device = detectDeviceInfo();

    return Object.assign({
        eventType,
        source: DEFAULT_SOURCE,
        page: DEFAULT_PAGE,
        sessionId: generateSessionId(),
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent || "unknown",
        // device info (best-effort, non-sensitive)
        deviceType: device.type,
        deviceOS: device.os,
        deviceBrand: device.brand,
        deviceModel: device.model,
        browser: device.browser,
        language: navigator.language || null,
        screenWidth: (window && window.screen && window.screen.width) || null,
        screenHeight: (window && window.screen && window.screen.height) || null,
        referrer: document.referrer || null,
        processed: false
    }, extra);
}

function detectDeviceInfo() {
    const ua = (navigator.userAgent || "").toLowerCase();
    const platform = (navigator.platform || "").toLowerCase();
    const screenW = (window && window.screen && window.screen.width) || 0;
    // device type
    let type = "Desktop";
    if (/smart-tv|smarttv|googletv|appletv|hbbtv|roku|tv/.test(ua)) {
        type = "TV";
    } else if (/mobile|iphone|ipod|android.*mobile|blackberry|bb10|opera mini/.test(ua) || screenW <= 767) {
        type = "Phone";
    } else if (/tablet|ipad|android(?!.*mobile)|nexus 7|nexus 9/.test(ua) || (screenW > 767 && screenW <= 1024)) {
        type = "Tablet";
    }

    // OS
    let os = "Other";
    if (/android/.test(ua)) os = "Android";
    else if (/iphone|ipad|ipod/.test(ua)) os = "iOS";
    else if (/windows nt/.test(ua)) os = "Windows";
    else if (/mac os x|macintosh/.test(ua) || platform.indexOf('mac') !== -1) os = "macOS";
    else if (/linux/.test(ua)) os = "Linux";

    // brand/model best-effort
    let brand = "Unknown";
    let model = null;
    if (/iphone|ipad|ipod|macintosh/.test(ua)) brand = "Apple";
    else if (/samsung|sm-/.test(ua)) brand = "Samsung";
    else if (/xiaomi|redmi|mi\b/.test(ua)) brand = "Xiaomi";
    else if (/pixel|nexus/.test(ua)) brand = "Google";

    // attempt to extract model (best-effort and conservative)
    try {
        const m = ua.match(/(iphone\d+,\d+|pixel \d|sm-[a-z0-9\-]+|nexus [0-9]+)/i);
        if (m && m[0]) model = m[0];
    } catch (e) {
        model = null;
    }

    // browser
    let browser = "Other";
    if (/edg\//.test(ua)) browser = "Edge";
    else if (/chrome\//.test(ua) && !/edg\//.test(ua) && !/opr\//.test(ua)) browser = "Chrome";
    else if (/safari\//.test(ua) && !/chrome\//.test(ua)) browser = "Safari";
    else if (/firefox\//.test(ua)) browser = "Firefox";
    else if (/opr\//.test(ua) || /opera\//.test(ua)) browser = "Opera";

    return { type, os, brand, model, browser };
}

function trackAnalyticsEvent(name, params = {}) {
    try {
        if (typeof window.gtag === "function") {
            window.gtag("event", name, Object.assign({
                event_category: "customer_interaction",
                page: DEFAULT_PAGE
            }, params));
        }
    } catch (error) {
        console.error("// TRACKER GA tracking failed:", error);
    }
}

async function sendEventToFirestore(eventType, extra = {}) {
    const payload = buildBasePayload(eventType, extra);
    try {
        const docRef = await addDoc(collection(db, EVENT_COLLECTION), payload);
        return docRef.id;
    } catch (error) {
        console.error(`// TRACKER Firebase write failed for ${eventType}:`, error);
        return null;
    }
}

async function createMenuOpenIfNeeded() {
    const already = safeSessionStorageGet(MENU_OPEN_KEY);
    if (already) return;
    const id = await sendEventToFirestore("MENU_OPEN", { source: DEFAULT_SOURCE, page: DEFAULT_PAGE });
    if (id) {
        safeSessionStorageSet(MENU_OPEN_KEY, id);
        // Only send GA when the Firestore/session guard allowed the first MENU_OPEN
        trackAnalyticsEvent("menu_open", { event_label: DEFAULT_PAGE });
    }
}

function setupPageImageViews() {
    const observed = new WeakSet();
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const page = el.dataset.page || el.id || el.alt || "unknown";
                const key = PAGE_VIEW_KEY_PREFIX + page;
                // Use sessionStorage key to guard both Firestore and GA4: send only once per session per page
                if (safeSessionStorageGet(key)) return;

                // perform Firestore write and only on success set session key and send GA
                (async () => {
                    try {
                        const id = await sendEventToFirestore("MENU_PAGE_VIEW", { pageViewed: page });
                        if (id) {
                            safeSessionStorageSet(key, id);
                            trackAnalyticsEvent("menu_page_view", { page: page });
                        }
                    } catch (e) {
                        console.error("// TRACKER MENU_PAGE_VIEW failed:", e);
                    }
                })();
            }
        });
    }, { threshold: 0.5 });

    function observeImage(el) {
        if (!el || !(el instanceof Element)) return;
        if (observed.has(el)) return;
        // ensure a stable page id
        if (!el.dataset.page) el.dataset.page = el.id || String(Math.floor(Math.random() * 1e9));
        obs.observe(el);
        observed.add(el);
    }

    // Observe existing images
    document.querySelectorAll('.menu-image').forEach(el => observeImage(el));

    // Watch for images added dynamically under #dynamicMenuContainer or the main container
    const container = document.getElementById('dynamicMenuContainer') || document.querySelector('.menu-container') || document.body;
    try {
        const mo = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) {
                    m.addedNodes.forEach(node => {
                        if (!(node instanceof Element)) return;
                        if (node.matches && node.matches('.menu-image')) {
                            observeImage(node);
                        }
                        // If container appends images inside wrappers, query inside
                        node.querySelectorAll && node.querySelectorAll('.menu-image').forEach(el => observeImage(el));
                    });
                }
            }
        });
        mo.observe(container, { childList: true, subtree: true });
    } catch (e) {
        // MutationObserver unsupported? still okay — existing images handled above
        console.error("// TRACKER MutationObserver init failed:", e);
    }
}

function setupScrollTracking() {
    let lastSent = 0;
    window.addEventListener("scroll", () => {
        const now = Date.now();
        if (now - lastSent < 5000) return; // throttle to 5s
        lastSent = now;
        const scY = window.scrollY || window.pageYOffset || 0;
        // Only send scroll analytics to GA4 (do NOT write scroll events to Firestore)
        trackAnalyticsEvent("menu_scroll", { scrollY: Math.round(scY) });
    }, { passive: true });
}

function setupClickTracking() {
    // Use delegated listener so elements added later are also tracked
    const idToEvent = {
        menuWhatsapp: "WHATSAPP_CLICK",
        menuInstagram: "INSTAGRAM_CLICK",
        menuFacebook: "FACEBOOK_CLICK",
        menuYoutube: "YOUTUBE_CLICK",
        menuMap: "MAP_CLICK"
    };

    document.addEventListener('click', (ev) => {
        try {
            const btn = ev.target.closest && ev.target.closest(Object.keys(idToEvent).map(id => `#${id}`).join(','));
            if (!btn) return;
            const id = btn.id;
            const eventName = idToEvent[id];
            if (!eventName) return;
            // Firestore write for important application events
            sendEventToFirestore(eventName, { elementId: id });
            // GA event
            trackAnalyticsEvent(eventName.toLowerCase(), { element: id });
        } catch (e) {
            console.error("// TRACKER click handling failed:", e);
        }
    }, { passive: true });
}

function setupMenuItemViewTracking() {
    // Placeholder: if you later add structured menu items, attach listeners here.
}

function initTracker() {
    try {
        createMenuOpenIfNeeded();
        setupPageImageViews();
        setupScrollTracking();
        setupClickTracking();
        setupMenuItemViewTracking();
    } catch (error) {
        console.error("// TRACKER init failed:", error);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTracker);
} else {
    initTracker();
}

