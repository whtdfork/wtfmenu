// js/components/navigation.js

import { loadFirebaseFiles } from "./firebase-files.js";
import { loadMomentsMedia } from "./moments-media.js";

export function initNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const tabContents = document.querySelectorAll(".tab-content");
    const pageTitle = document.getElementById("pageTitle");

    navItems.forEach((button) => {
        button.addEventListener("click", () => {
            const targetTab = button.getAttribute("data-tab");

            navItems.forEach((btn) => btn.classList.remove("active"));
            tabContents.forEach((content) => content.classList.remove("active"));

            button.classList.add("active");

            const activeTabContent = document.getElementById(`tab-${targetTab}`);
            if (activeTabContent) {
                activeTabContent.classList.add("active");
            }

            if (pageTitle) {
                switch (targetTab) {
                    case 'menu-images':
                        pageTitle.textContent = 'Menu Images';
                        break;
                    case 'today-offer':
                        pageTitle.textContent = "Today's Offer";
                        break;
                    case 'restaurant-info':
                        pageTitle.textContent = 'Restaurant Info';
                        break;
                    case 'moments':
                        pageTitle.textContent = 'Moments ⭐';
                        break;
                    case 'moments-media':
                        pageTitle.textContent = 'Moments Media';
                        break;
                    case 'gallery':
                        pageTitle.textContent = 'Gallery';
                        break;
                    case 'opening-hours':
                        pageTitle.textContent = 'Opening Hours';
                        break;
                    case 'firebase-files':
                        pageTitle.textContent = 'Firebase Files';
                        break;
                    default:
                        pageTitle.textContent = 'Admin Panel';
                }
            }

            if (targetTab === "gallery") {
                // loadExistingImages();
            }
            if (targetTab === "moments") {
                // loadMoments();
            }
            if (targetTab === "moments-media") {
                loadMomentsMedia();
            }
            if (targetTab === "firebase-files") {
                loadFirebaseFiles();
            }
        });
    });
}