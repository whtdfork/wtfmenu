import { db } from "./firebase-config.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements mapping category key to img element ID in index.html
const menuImageMap = {
    cover: "img-cover",
    pizza: "img-pizza",
    momos: "img-momos",
    desserts: "img-desserts",
    thankyou: "img-thankyou"
};

// Listen for real-time updates from Firestore
function listenForMenuUpdates() {
    const menuDocRef = doc(db, "menu", "cards");

    onSnapshot(menuDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("// Menu data updated from Firestore:", data);

            // Update each image element on the page
            Object.keys(menuImageMap).forEach((category) => {
                const imgElementId = menuImageMap[category];
                const imgElement = document.getElementById(imgElementId);

                if (imgElement && data[category]) {
                    imgElement.src = data[category];
                }
            });
        } else {
            console.log("// No menu card data found in Firestore yet.");
        }
    }, (error) => {
        console.error("// Error fetching live menu updates:", error);
    });
}

// Initialize real-time listener when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    listenForMenuUpdates();
});