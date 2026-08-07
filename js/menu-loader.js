// js/menu-loader.js
import { db } from "./firebase-config.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Container
const menuContainer = document.getElementById("dynamicMenuContainer");

// Cache state to prevent unnecessary DOM re-renders
let currentPagesCache = [];

// Preload image before inserting into DOM to eliminate load flicker
function preloadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

// Optimized real-time listener using DOM diffing
function listenForMenuUpdates() {
    if (!menuContainer) {
        console.error("// Error: Dynamic menu container (#dynamicMenuContainer) not found.");
        return;
    }

    const menuDocRef = doc(db, "menu", "dynamic_cards");

    onSnapshot(menuDocRef, async (docSnap) => {
        if (docSnap.exists() && docSnap.data().pages) {
            let pages = docSnap.data().pages;

            // Sort pages strictly by order index (0, 1, 2...)
            pages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            // Filter out pages that don't have an uploaded image URL
            const activePages = pages.filter(page => page.url && page.url.trim() !== "");

            if (activePages.length === 0) {
                console.log("// No active menu images found in Firestore.");
                menuContainer.innerHTML = `<p style="text-align: center; padding: 40px; color: #888;">No menu pages available at the moment.</p>`;
                currentPagesCache = [];
                return;
            }

            // Detect if anything actually changed compared to current state
            const hasChanged = JSON.stringify(activePages) !== JSON.stringify(currentPagesCache);
            if (!hasChanged) {
                console.log("// Menu state unchanged. Skipping DOM rebuild.");
                return;
            }

            console.log(`// Live menu updated: Processing ${activePages.length} active pages.`);

            // Clear loading state if present
            const loadingBox = document.getElementById("menuLoading");
            if (loadingBox) {
                loadingBox.remove();
            }

            // Remove deleted pages from DOM
            const activeIds = new Set(activePages.map(p => p.id));
            Array.from(menuContainer.children).forEach(child => {
                if (child.tagName === "IMG" && !activeIds.has(child.id)) {
                    child.remove();
                }
            });

            // Synchronize and update existing or new image nodes cleanly
            for (let index = 0; index < activePages.length; index++) {
                const page = activePages[index];
                let existingImg = document.getElementById(page.id);

                if (existingImg) {
                    // Update image source only if URL changed
                    if (existingImg.src !== page.url) {
                        await preloadImage(page.url);
                        existingImg.src = page.url;
                    }
                    existingImg.alt = page.title || `Menu Page ${index + 1}`;
                } else {
                    // Create new image node
                    await preloadImage(page.url);
                    const newImg = document.createElement("img");
                    newImg.id = page.id;
                    newImg.className = "menu-image";
                    newImg.src = page.url;
                    newImg.alt = page.title || `Menu Page ${index + 1}`;
                    newImg.loading = index === 0 ? "eager" : "lazy"; // First image loads fast, rest lazy load

                    menuContainer.appendChild(newImg);
                }
            }

            // Update local memory cache
            currentPagesCache = activePages;

        } else {
            console.log("// No dynamic cards document found in Firestore.");
            menuContainer.innerHTML = `<p style="text-align: center; padding: 40px; color: #888;">Menu content is currently updating.</p>`;
            currentPagesCache = [];
        }
    }, (error) => {
        console.error("// Error fetching live menu updates:", error);
        menuContainer.innerHTML = `<p style="text-align: center; padding: 40px; color: #dc3545;">Failed to load live menu. Please try again.</p>`;
    });
}

// Initialize real-time listener when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    listenForMenuUpdates();
});