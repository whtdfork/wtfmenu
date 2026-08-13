// js/admin.js

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initAuth } from "./components/auth.js";
import { initNavigation } from "./components/navigation.js";
import { loadDynamicMenu } from "./components/dynamic-menu.js";
import { setupImageModal } from "./components/modal.js";
import { initFirebaseFileUpload, loadFirebaseFiles } from "./components/firebase-files.js";
import { initMomentsMediaUpload, loadMomentsMedia } from "./components/moments-media.js";
import { initMomentsMediaPicker } from "./components/moments-media-picker.js";
import { doc, getDoc, setDoc, collection, getDocs, query, where, serverTimestamp, Timestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import "./moments.js";

function setAdminLoader(show, message = "Loading...") {
    const loader = document.getElementById("adminLoader");
    const text = document.getElementById("adminLoaderText");
    if (!loader) return;
    if (text) text.textContent = message;
    loader.classList.toggle("hidden", !show);
    loader.setAttribute("aria-busy", show ? "true" : "false");
}

window.showAdminLoader = (message = "Loading...") => setAdminLoader(true, message);
window.hideAdminLoader = () => setAdminLoader(false);

let currentSiteSettings = null;

async function loadExistingImages() {}
async function loadMoments() {}

async function loadSiteSettings() {
    const defaultSettings = window.SITE_CONFIG || {};
    try {
        const settingsDoc = await getDoc(doc(db, "settings", "site_settings"));
        if (settingsDoc.exists()) {
            return { ...defaultSettings, ...settingsDoc.data() };
        }
    } catch (error) {
        console.error("// Admin Error: Could not load site settings from Firestore", error);
    }
    return defaultSettings;
}

function setFormValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value || "";
    }
}

function populateRestaurantInfoForm(settings) {
    setFormValue("siteAddressInput", settings.address);
    setFormValue("sitePhoneInput", settings.phone);
    setFormValue("siteEmailInput", settings.email);
    setFormValue("siteWhatsappInput", settings.whatsappNumber);
    setFormValue("siteMapUrlInput", settings.mapUrl);
    setFormValue("siteInstagramInput", settings.socials?.Instagram);
    setFormValue("siteFacebookInput", settings.socials?.Facebook);
    setFormValue("siteYoutubeInput", settings.socials?.YouTube);
}

function populateTodayOfferForm(settings) {
    setFormValue("todayOfferAnnouncementInput", settings.announcement);
}

function formatTimestamp(value) {
    if (!value) return "Not available";
    if (value?.toDate) {
        return new Date(value.toDate()).toLocaleString();
    }
    if (typeof value === "string") {
        return value;
    }
    return new Date(value).toLocaleString();
}

function renderDashboard(settings, menuCount = 0, activeMomentCount = 0) {
    const offerText = settings.announcement || "No offer set yet.";
    const dashboardOffer = document.getElementById("dashboardOfferText");
    const menuCountEl = document.getElementById("dashboardMenuPagesCount");
    const activeMomentEl = document.getElementById("dashboardActiveMomentsCount");
    const lastUpdatedEl = document.getElementById("dashboardLastUpdated");

    if (menuCountEl) menuCountEl.textContent = String(menuCount);
    if (activeMomentEl) activeMomentEl.textContent = String(activeMomentCount);
    if (dashboardOffer) dashboardOffer.textContent = offerText;
    if (lastUpdatedEl) lastUpdatedEl.textContent = formatTimestamp(settings.lastUpdated);
}

async function refreshDashboard() {
    const menuDoc = await getDoc(doc(db, "menu", "dynamic_cards"));
    const menuCount = menuDoc.exists() && Array.isArray(menuDoc.data()?.pages) ? menuDoc.data().pages.length : 0;

    const activeQuery = query(collection(db, "moments"), where("isActive", "==", true));
    const snapshot = await getDocs(activeQuery);
    const activeMomentCount = snapshot.size;

    renderDashboard(currentSiteSettings || {}, menuCount, activeMomentCount);
    // load customerEvents stats
    try {
        await loadCustomerEventsStats();
    } catch (e) {
        console.error("// Admin Error: loadCustomerEventsStats failed", e);
    }

    // wire up detailed analytics button (lazy load)
    const showBtn = document.getElementById('showDetailedBtn');
    const hideBtn = document.getElementById('hideDetailedBtn');
    const detailedDiv = document.getElementById('detailedAnalytics');
    if (showBtn) {
        showBtn.addEventListener('click', async () => {
            showBtn.style.display = 'none';
            if (hideBtn) hideBtn.style.display = '';
            if (detailedDiv) detailedDiv.style.display = '';
            await loadDetailedAnalytics();
        });
    }
    if (hideBtn) {
        hideBtn.addEventListener('click', () => {
            hideBtn.style.display = 'none';
            if (showBtn) showBtn.style.display = '';
            if (detailedDiv) detailedDiv.style.display = 'none';
        });
    }
}

// Fetch detailed analytics on demand
async function loadDetailedAnalytics() {
    // Last 7 days
    const now = new Date();
    const last7 = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const statsLast7 = await fetchEventTotalsSince(Timestamp.fromDate(last7));
    const statsMonth = await fetchEventTotalsSince(Timestamp.fromDate(monthStart));
    const statsYear = await fetchEventTotalsSince(Timestamp.fromDate(yearStart));
    const statsAll = await fetchEventTotalsSince(null); // all time

    const setDetail = (containerId, stats, label) => {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = `<strong>${label}</strong><div>Visitors: ${stats.visitors}</div><div>Unique Sessions: ${stats.sessions}</div><div>Page Views: ${stats.pageViews}</div><div>Other Events: ${stats.otherEvents}</div>`;
    };

    setDetail('detailedLast7', statsLast7, 'Last 7 days');
    setDetail('detailedMonthly', statsMonth, 'This Month');
    setDetail('detailedYearly', statsYear, 'This Year');
    setDetail('detailedAllTime', statsAll, 'All Time');
}

async function fetchEventTotalsSince(sinceTimestamp) {
    const eventsRef = collection(db, 'customerEvents');
    let q;
    if (sinceTimestamp) {
        q = query(eventsRef, where('createdAt', '>=', sinceTimestamp));
    } else {
        q = query(eventsRef);
    }
    const snap = await getDocs(q);
    const totals = { visitors: 0, pageViews: 0, sessions: new Set(), otherEvents: 0 };
    snap.forEach(docSnap => {
        const d = docSnap.data();
        const type = d.eventType || '';
        if (type === 'MENU_OPEN') totals.visitors += 1;
        else if (type === 'MENU_PAGE_VIEW') totals.pageViews += 1;
        else totals.otherEvents += 1;
        if (d.sessionId) totals.sessions.add(d.sessionId);
    });
    return { visitors: totals.visitors, pageViews: totals.pageViews, sessions: totals.sessions.size, otherEvents: totals.otherEvents };
}

function clearElement(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
}

async function loadCustomerEventsStats() {
    // Summary: Today (local midnight -> now) and Current Month (1st day -> now)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    const eventsRef = collection(db, "customerEvents");

    // fetch events since todayStart for today's stats
    const todayQ = query(eventsRef, where("createdAt", ">=", Timestamp.fromDate(todayStart)), orderBy("createdAt", "desc"));
    const todaySnap = await getDocs(todayQ);

    // fetch events since monthStart for month stats
    const monthQ = query(eventsRef, where("createdAt", ">=", Timestamp.fromDate(monthStart)), orderBy("createdAt", "desc"));
    const monthSnap = await getDocs(monthQ);

    const totals = { visitors: 0, pageViews: 0, sessions: new Set(), byEvent: {}, byPage: {}, byDeviceType: {}, byOS: {}, byBrand: {}, byBrowser: {}, byScreen: {}, deviceHierarchy: { Phone: { total: 0, os: {} }, Computer: { total: 0, os: {} }, Other: { total: 0, items: {} } } };
    const recent = [];

    todaySnap.forEach(docSnap => {
        const d = docSnap.data();
        const type = d.eventType || "unknown";
        totals.byEvent[type] = (totals.byEvent[type] || 0) + 1;
        if (type === "MENU_OPEN") totals.visitors += 1;
        if (type === "MENU_PAGE_VIEW") {
            totals.pageViews += 1;
            const page = d.pageViewed || d.page || "unknown";
            totals.byPage[page] = (totals.byPage[page] || 0) + 1;
        }
        if (d.sessionId) totals.sessions.add(d.sessionId);
        const dtype = d.deviceType || 'Unknown';
        const dos = d.deviceOS || 'Unknown';
        const dbrand = d.deviceBrand || d.brand || 'Unknown';
        const dbrowser = d.browser || 'Unknown';
        const screenKey = (d.screenWidth && d.screenHeight) ? `${d.screenWidth}x${d.screenHeight}` : 'Unknown';
        // Build hierarchical device breakdown: Phone | Computer | Other
        let primaryDevice = 'Other';
        const dtypeKey = String(dtype || 'Unknown').toLowerCase();
        if (dtypeKey === 'phone' || dtypeKey === 'tablet') primaryDevice = 'Phone';
        else if (dtypeKey === 'desktop') primaryDevice = 'Computer';
        else primaryDevice = 'Other';

        totals.deviceHierarchy[primaryDevice].total = (totals.deviceHierarchy[primaryDevice].total || 0) + 1;
        const osBucket = totals.deviceHierarchy[primaryDevice].os;
        const osKey = dos || 'Unknown OS';
        if (!osBucket[osKey]) osBucket[osKey] = { total: 0, brands: {} };
        osBucket[osKey].total += 1;
        const brandKey = dbrand || 'Unknown Brand';
        osBucket[osKey].brands[brandKey] = (osBucket[osKey].brands[brandKey] || 0) + 1;

        // Also keep flat summaries for legacy views
        totals.byDeviceType[dtype] = (totals.byDeviceType[dtype] || 0) + 1;
        totals.byOS[dos] = (totals.byOS[dos] || 0) + 1;
        totals.byBrand[dbrand] = (totals.byBrand[dbrand] || 0) + 1;
        totals.byBrowser[dbrowser] = (totals.byBrowser[dbrowser] || 0) + 1;
        totals.byScreen[screenKey] = (totals.byScreen[screenKey] || 0) + 1;
        recent.push({ id: docSnap.id, ...d });
    });

    // Month stats separately
    const monthTotals = { visitors: 0, pageViews: 0, sessions: new Set() };
    monthSnap.forEach(docSnap => {
        const d = docSnap.data();
        const type = d.eventType || "unknown";
        if (type === "MENU_OPEN") monthTotals.visitors += 1;
        if (type === "MENU_PAGE_VIEW") monthTotals.pageViews += 1;
        if (d.sessionId) monthTotals.sessions.add(d.sessionId);
    });

    // Render summary stats
    const visitorsEl = document.getElementById("statVisitorsToday");
    const sessionsEl = document.getElementById("statUniqueSessions");
    const pageViewsEl = document.getElementById("statPageViews");
    if (visitorsEl) visitorsEl.textContent = String(totals.visitors);
    if (sessionsEl) sessionsEl.textContent = String(totals.sessions.size);
    if (pageViewsEl) pageViewsEl.textContent = String(totals.pageViews);

    // Month summary
    const visitorsMonthEl = document.getElementById("statVisitorsMonth");
    const sessionsMonthEl = document.getElementById("statUniqueSessionsMonth");
    const pageViewsMonthEl = document.getElementById("statPageViewsMonth");
    if (visitorsMonthEl) visitorsMonthEl.textContent = String(monthTotals.visitors);
    if (sessionsMonthEl) sessionsMonthEl.textContent = String(monthTotals.sessions.size);
    if (pageViewsMonthEl) pageViewsMonthEl.textContent = String(monthTotals.pageViews);

    // Events breakdown
    const eventsBreakdownEl = document.getElementById("eventsBreakdown");
    if (eventsBreakdownEl) {
        eventsBreakdownEl.innerHTML = "";
        Object.keys(totals.byEvent).sort().forEach(evt => {
            const card = document.createElement("div");
            card.style.background = "#f8fafc";
            card.style.padding = "10px";
            card.style.borderRadius = "8px";
            card.style.border = "1px solid #eef2ff";
            card.innerHTML = `<small style=\"color:#64748b;\">${evt}</small><div style=\"font-weight:700;font-size:1.2rem;\">${totals.byEvent[evt]}</div>`;
            eventsBreakdownEl.appendChild(card);
        });
    }

    // Page views list
    const pageViewsListEl = document.getElementById("pageViewsList");
    if (pageViewsListEl) {
        pageViewsListEl.innerHTML = "";
        const entries = Object.entries(totals.byPage).sort((a,b) => b[1]-a[1]);
        if (entries.length === 0) {
            pageViewsListEl.innerHTML = "<p class=\"muted\">No page views in the last 24 hours.</p>";
        } else {
            entries.forEach(([page, count]) => {
                const row = document.createElement("div");
                row.style.display = "flex";
                row.style.justifyContent = "space-between";
                row.style.padding = "6px 8px";
                row.style.borderBottom = "1px dashed #eef2ff";
                row.innerHTML = `<span>Page ${page}</span><strong>${count}</strong>`;
                pageViewsListEl.appendChild(row);
            });
        }
    }

    // Recent events
    const recentEl = document.getElementById("recentEventsList");
    if (recentEl) {
        recentEl.innerHTML = "";
        recent.slice(0, 200).forEach(evt => {
            const time = evt.createdAt && evt.createdAt.toDate ? evt.createdAt.toDate().toLocaleString() : "-";
            const line = document.createElement("div");
            line.style.padding = "6px 4px";
            line.style.borderBottom = "1px solid #f1f5f9";
            const deviceInfo = `type:${evt.deviceType||evt.type||'-'} os:${evt.deviceOS||evt.os||'-'} brand:${evt.deviceBrand||evt.brand||'-'} browser:${evt.browser||'-'} screen:${(evt.screenWidth&&evt.screenHeight)?evt.screenWidth+'x'+evt.screenHeight:'-'} `;
            line.innerHTML = `<div><strong>${evt.eventType || 'evt'}</strong> <span style=\"color:#94a3b8;\">${time}</span></div><div style=\"color:#0f172a;\">session:${evt.sessionId || '-'} page:${evt.page || evt.pageViewed || '-'} ${deviceInfo}</div><div style=\"color:#475569;\">ua:${(evt.userAgent||'').slice(0,120)}</div>`;
            recentEl.appendChild(line);
        });
    }

    // Render hierarchical device breakdown optimized for mobile
    const renderDeviceHierarchy = (hierarchy, containerId) => {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = '';
        const containerStyle = 'background:#ffffff;padding:12px;border-radius:10px;border:1px solid #eef2ff;display:flex;flex-direction:column;gap:10px;';

        Object.keys(hierarchy).forEach(primary => {
            const block = document.createElement('div');
            block.style.cssText = containerStyle;

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.innerHTML = `<div style="font-weight:700">${primary}</div><div style="font-size:1.2rem;font-weight:800;color:#0f172a">${hierarchy[primary].total || 0}</div>`;
            block.appendChild(header);

            const osList = document.createElement('div');
            osList.style.display = 'flex';
            osList.style.flexDirection = 'column';
            osList.style.gap = '8px';
            osList.style.marginTop = '8px';

            const osEntries = hierarchy[primary].os ? Object.entries(hierarchy[primary].os) : [];
            if (osEntries.length === 0) {
                const none = document.createElement('div');
                none.style.color = '#64748b';
                none.textContent = 'No data';
                osList.appendChild(none);
            } else {
                osEntries.sort((a,b)=>b[1].total-a[1].total).forEach(([osName, osData]) => {
                    const osRow = document.createElement('div');
                    osRow.style.display = 'flex';
                    osRow.style.flexDirection = 'column';
                    osRow.style.gap = '6px';

                    const osHeader = document.createElement('div');
                    osHeader.style.display = 'flex';
                    osHeader.style.justifyContent = 'space-between';
                    osHeader.style.alignItems = 'center';
                    osHeader.innerHTML = `<div style="font-weight:600;color:#0f172a">${osName}</div><div style="font-weight:700;color:#0f172a">${osData.total}</div>`;
                    osRow.appendChild(osHeader);

                    const brandsWrap = document.createElement('div');
                    brandsWrap.style.display = 'flex';
                    brandsWrap.style.flexWrap = 'wrap';
                    brandsWrap.style.gap = '6px';

                    Object.keys(osData.brands || {}).sort((a,b)=>osData.brands[b]-osData.brands[a]).forEach(brand => {
                        const chip = document.createElement('div');
                        chip.style.background = '#f8fafc';
                        chip.style.padding = '6px 8px';
                        chip.style.borderRadius = '999px';
                        chip.style.border = '1px solid #e6eef8';
                        chip.style.fontSize = '0.9rem';
                        chip.textContent = `${brand} · ${osData.brands[brand]}`;
                        brandsWrap.appendChild(chip);
                    });

                    osRow.appendChild(brandsWrap);
                    osList.appendChild(osRow);
                });
            }

            block.appendChild(osList);
            el.appendChild(block);
        });
    };

    // Render device breakdowns (legacy fallback below)
    const renderBreakdown = (map, containerId) => {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = '';
        Object.keys(map).sort((a,b)=>map[b]-map[a]).forEach(k => {
            const chip = document.createElement('div');
            chip.style.background = '#f8fafc';
            chip.style.padding = '8px 10px';
            chip.style.borderRadius = '8px';
            chip.style.border = '1px solid #eef2ff';
            chip.innerHTML = `<small style=\"color:#64748b;display:block;\">${k}</small><strong style=\"display:block;\">${map[k]}</strong>`;
            el.appendChild(chip);
        });
    };
    // Use hierarchical view for device types (mobile-first)
    renderDeviceHierarchy(totals.deviceHierarchy, 'deviceTypeBreakdown');
    renderBreakdown(totals.byOS, 'osBreakdown');
    renderBreakdown(totals.byBrand, 'brandBreakdown');
    renderBreakdown(totals.byBrowser, 'browserBreakdown');
    renderBreakdown(totals.byScreen, 'screenSizeBreakdown');

}

async function saveSiteSettings(changes) {
    try {
        window.showAdminLoader("Saving site settings...");
        await setDoc(doc(db, "settings", "site_settings"), {
            ...changes,
            lastUpdated: serverTimestamp()
        }, { merge: true });
        currentSiteSettings = { ...currentSiteSettings, ...changes, lastUpdated: new Date() };
        if (changes.announcement) {
            const dashboardOffer = document.getElementById("dashboardOfferText");
            if (dashboardOffer) dashboardOffer.textContent = changes.announcement;
        }
        renderDashboard(currentSiteSettings);
        alert("Site settings saved successfully.");
    } catch (error) {
        console.error("// Admin Error: Failed to save site settings", error);
        alert("Failed to save settings. Check console for details.");
    } finally {
        window.hideAdminLoader();
    }
}

async function initSiteSettings() {
    currentSiteSettings = await loadSiteSettings();
    populateRestaurantInfoForm(currentSiteSettings);
    populateTodayOfferForm(currentSiteSettings);
    await refreshDashboard();
}

function initSettingsListeners() {
    const saveRestaurantButton = document.getElementById("saveRestaurantInfoBtn");
    const saveOfferButton = document.getElementById("saveTodayOfferBtn");

    if (saveRestaurantButton) {
        saveRestaurantButton.addEventListener("click", async () => {
            const changes = {
                address: document.getElementById("siteAddressInput")?.value || "",
                phone: document.getElementById("sitePhoneInput")?.value || "",
                email: document.getElementById("siteEmailInput")?.value || "",
                whatsappNumber: document.getElementById("siteWhatsappInput")?.value || "",
                mapUrl: document.getElementById("siteMapUrlInput")?.value || "",
                socials: {
                    Instagram: document.getElementById("siteInstagramInput")?.value || "",
                    Facebook: document.getElementById("siteFacebookInput")?.value || "",
                    YouTube: document.getElementById("siteYoutubeInput")?.value || ""
                }
            };
            await saveSiteSettings(changes);
        });
    }

    if (saveOfferButton) {
        saveOfferButton.addEventListener("click", async () => {
            const announcement = document.getElementById("todayOfferAnnouncementInput")?.value || "";
            await saveSiteSettings({ announcement });
        });
    }
}

// Track initialization state to prevent double execution
let isAppInitialized = false;

// Initialize Auth Guard & App Bootstrapping
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../admin/login.html";
    } else {
        console.log("// Auth Guard Verified: Logged in as", user.email);
        const emailEl = document.getElementById("userEmail");
        if (emailEl) emailEl.textContent = user.email;
        
        if (!isAppInitialized) {
            isAppInitialized = true;
            await loadDynamicMenu();
            await loadExistingImages();
            await loadMoments();
            setupImageModal();
            await initMomentsMediaPicker();
            await initSiteSettings();
            
            // Initialize moments button event listeners (Save, Preview, Deactivate)
            if (typeof initMoments === "function") {
                initMoments();
            }
        }
    }
});

// Initialize Modular Components on DOM Load
function bootApp() {
    console.log("// Booting admin panel modular components...");
    initAuth();
    initNavigation();
    initFirebaseFileUpload();
    initMomentsMediaUpload();
    initSettingsListeners();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootApp);
} else {
    bootApp();
}