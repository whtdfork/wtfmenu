// js/menu-loader.js
import { db } from "./firebase-config.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Container
const menuContainer = document.getElementById("dynamicMenuContainer");

// Cache state to track rendered page IDs
let renderedPageIds = "";

// Fast real-time listener without network-blocking preloads
function listenForMenuUpdates() {
    if (!menuContainer) {
        console.error("// Error: Dynamic menu container (#dynamicMenuContainer) not found.");
        return;
    }

    // Edited: Fixed double doc() wrapper bug
    const menuDocRef = doc(db, "menu", "dynamic_cards");

    onSnapshot(menuDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().pages) {
            let pages = docSnap.data().pages;

            // Sort pages strictly by order index (0, 1, 2...)
            pages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            // Filter out pages without valid URLs
            const activePages = pages.filter(page => page.url && page.url.trim() !== "");

            if (activePages.length === 0) {
                menuContainer.innerHTML = `<p style="text-align: center; padding: 40px; color: #888;">No menu pages available at the moment.</p>`;
                renderedPageIds = "";
                return;
            }

            // Create a footprint string to check if layout/order changed
            const currentFootprint = activePages.map(p => `${p.id}_${p.url}`).join("|");
            
            // Skip DOM work if nothing changed
            if (currentFootprint === renderedPageIds) {
                console.log("// Menu structure unchanged. Skipping render.");
                return;
            }

            console.log(`// Rendering ${activePages.length} pages instantly to DOM.`);

            // Clear loading box if present
            const loadingBox = document.getElementById("menuLoading");
            if (loadingBox) {
                loadingBox.remove();
            }

            // Clean existing missing images
            const activeIds = new Set(activePages.map(p => p.id));
            Array.from(menuContainer.children).forEach(child => {
                if (child.tagName === "IMG" && !activeIds.has(child.id)) {
                    child.remove();
                }
            });

            // Update or append images instantly without blocking JS thread
            activePages.forEach((page, index) => {
                let existingImg = document.getElementById(page.id);

                if (existingImg) {
                    if (existingImg.src !== page.url) {
                        existingImg.src = page.url;
                    }
                    existingImg.alt = page.title || `Menu Page ${index + 1}`;
                } else {
                    const newImg = document.createElement("img");
                    newImg.id = page.id;
                    newImg.className = "menu-image";
                    newImg.src = page.url;
                    newImg.alt = page.title || `Menu Page ${index + 1}`;
                    
                    // First page loads eagerly, subsequent images lazy load as user scrolls
                    newImg.loading = index === 0 ? "eager" : "lazy";

                    menuContainer.appendChild(newImg);
                }
            });

            renderedPageIds = currentFootprint;

        } else {
            menuContainer.innerHTML = `<p style="text-align: center; padding: 40px; color: #888;">Menu content is currently updating.</p>`;
            renderedPageIds = "";
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