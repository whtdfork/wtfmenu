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
import { doc, getDoc, setDoc, collection, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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