import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const CUSTOMER_EVENT_SESSION_KEY = "whtdfork.customerEventRecorded";
const CUSTOMER_SESSION_ID_KEY = "whtdfork.customerSessionId";
const CUSTOMER_EVENT_COLLECTION = "customerEvents";
const CUSTOMER_EVENT_TYPE = "MENU_SCAN";
const CUSTOMER_EVENT_PAGE = "index";
const CUSTOMER_EVENT_SOURCE = "menu";

function safeSessionStorageGet(key) {
    try {
        return window.sessionStorage.getItem(key);
    } catch (error) {
        console.error("// MENU_SCAN sessionStorage read failed:", error);
        return null;
    }
}

function safeSessionStorageSet(key, value) {
    try {
        window.sessionStorage.setItem(key, value);
    } catch (error) {
        console.error("// MENU_SCAN sessionStorage write failed:", error);
    }
}

function generateSessionId() {
    const existingSessionId = safeSessionStorageGet(CUSTOMER_SESSION_ID_KEY);
    if (existingSessionId) {
        return existingSessionId;
    }

    const randomPart = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    const newSessionId = `${Date.now()}-${randomPart()}-${randomPart()}-${randomPart()}`;
    safeSessionStorageSet(CUSTOMER_SESSION_ID_KEY, newSessionId);
    return newSessionId;
}

function buildCustomerEventPayload() {
    return {
        eventType: CUSTOMER_EVENT_TYPE,
        page: CUSTOMER_EVENT_PAGE,
        source: CUSTOMER_EVENT_SOURCE,
        createdAt: serverTimestamp(),
        sessionId: generateSessionId(),
        userAgent: navigator.userAgent || "unknown",
        processed: false
    };
}

function trackAnalyticsEvent() {
    try {
        if (typeof window.gtag === "function") {
            window.gtag("event", "menu_scan", {
                event_category: "customer_interaction",
                event_label: CUSTOMER_EVENT_PAGE,
                page: CUSTOMER_EVENT_PAGE,
                source: CUSTOMER_EVENT_SOURCE
            });
        }
    } catch (error) {
        console.error("// MENU_SCAN GA tracking failed:", error);
    }
}

async function createCustomerEventIfNeeded() {
    const alreadyRecorded = safeSessionStorageGet(CUSTOMER_EVENT_SESSION_KEY);
    if (alreadyRecorded) {
        console.log("// MENU_SCAN skipped: session already recorded");
        return;
    }

    const eventPayload = buildCustomerEventPayload();
    try {
        const docRef = await addDoc(collection(db, CUSTOMER_EVENT_COLLECTION), eventPayload);
        safeSessionStorageSet(CUSTOMER_EVENT_SESSION_KEY, docRef.id);
        console.log(`// MENU_SCAN event created: ${docRef.id}`);
    } catch (error) {
        console.error("// MENU_SCAN Firebase write failed:", error);
    }

    trackAnalyticsEvent();
}

createCustomerEventIfNeeded();
