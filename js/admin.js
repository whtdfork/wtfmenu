// js/admin.js

import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initAuth } from "./components/auth.js";
import { initNavigation } from "./components/navigation.js";
import { loadDynamicMenu } from "./components/dynamic-menu.js";
import { setupImageModal } from "./components/modal.js";
import { initFirebaseFileUpload, loadFirebaseFiles } from "./components/firebase-files.js";
import { initMomentsMediaUpload, loadMomentsMedia } from "./components/moments-media.js";
import { initMomentsMediaPicker } from "./components/moments-media-picker.js";
// Correct path to your moments management file containing the save/preview/deactivate listeners
import "./moments.js";

async function loadExistingImages() {}
async function loadMoments() {}

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
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootApp);
} else {
    bootApp();
}