// js/admin.js

import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initAuth } from "./components/auth.js";
import { initNavigation } from "./components/navigation.js";
import { loadDynamicMenu } from "./components/dynamic-menu.js";
import { setupImageModal } from "./components/modal.js";
import { initFirebaseFileUpload, loadFirebaseFiles } from "./components/firebase-files.js";
import { initMomentsMediaUpload, loadMomentsMedia } from "./components/moments-media.js";

// Dummy placeholders if not defined elsewhere yet
async function loadExistingImages() {}
async function loadMoments() {}

// Initialize Auth Guard & App Bootstrapping
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../admin/login.html";
    } else {
        console.log("// Auth Guard Verified: Logged in as", user.email);
        const emailEl = document.getElementById("userEmail");
        if (emailEl) emailEl.textContent = user.email;
        
        await loadDynamicMenu();
        await loadExistingImages();
        await loadMoments();
        setupImageModal();
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