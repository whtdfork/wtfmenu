// js/moments.js
import { db } from "./firebase-config.js";
import { collection, query, where, getDocs, limit, doc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Container for Moments (present on public menu page)
const momentsContainer = document.getElementById("momentsContainer");

// Initialize on Page Load
document.addEventListener("DOMContentLoaded", () => {
    // If we are on the public menu page
    if (momentsContainer) {
        MomentsEngine.renderActiveMoment(momentsContainer);
    }

    // If we are on the admin page, sync button and badge state with Firestore
    if (document.getElementById("toggleMomentBtn")) {
        window.syncMomentAdminUI();
    }
});

// Fetch current status from Firestore and reflect it in Admin UI
window.syncMomentAdminUI = async function() {
    const toggleBtn = document.getElementById("toggleMomentBtn");
    const badge = document.getElementById("momentBadge");

    if (!toggleBtn) return;

    try {
        console.log("// Moments: Syncing Admin UI state with Firestore...");
        const momentsRef = collection(db, "moments");
        const querySnapshot = await getDocs(momentsRef);

        if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0].data();
            const isActive = docData.isActive === true;
            updateAdminUIState(isActive, toggleBtn, badge);
        } else {
            // Default is Active if no document exists yet
            updateAdminUIState(true, toggleBtn, badge);
        }
    } catch (e) {
        console.e("// Moments Error: Failed to sync Admin UI state", e);
    }
};

// Helper function to keep UI tags and action buttons consistent
function updateAdminUIState(isActive, toggleBtn, badge) {
    if (isActive) {
        // Current State: ACTIVE -> Action available: Deactivate
        toggleBtn.innerText = "Deactivate";
        toggleBtn.classList.add("deactivate-btn");
        toggleBtn.classList.remove("activate-btn");
        
        if (badge) {
            badge.innerText = "ACTIVE";
            badge.style.display = "inline-block";
        }
    } else {
        // Current State: INACTIVE -> Action available: Activate
        toggleBtn.innerText = "Activate";
        toggleBtn.classList.add("activate-btn");
        toggleBtn.classList.remove("deactivate-btn");
        
        if (badge) {
            badge.style.display = "none";
        }
    }
}

// Global Toggle Function for Admin Button
window.toggleMomentStatus = async function() {
    console.log("// Moments: Toggle button clicked");

    const toggleBtn = document.getElementById("toggleMomentBtn");
    const badge = document.getElementById("momentBadge");

    if (!toggleBtn) {
        console.e("// Moments Error: toggleMomentBtn element not found in DOM");
        return;
    }

    toggleBtn.disabled = true;

    // Determine current state based on button action label
    // If button says "Deactivate", it means it is currently active!
    const isCurrentlyActive = toggleBtn.innerText.trim() === "Deactivate";
    const newStatus = !isCurrentlyActive;

    try {
        console.log(`// Moments: Setting active status to ${newStatus} in Firestore...`);

        const momentsRef = collection(db, "moments");
        const querySnapshot = await getDocs(momentsRef);

        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            await updateDoc(doc(db, "moments", docSnap.id), {
                isActive: newStatus
            });
            console.log("// Moments: Firestore updated successfully.");
        } else {
            const defaultDocRef = doc(momentsRef, "everyday-welcome");
            await setDoc(defaultDocRef, {
                momentId: "everyday-welcome",
                name: "Everyday Warm Welcome",
                type: "welcome",
                theme: "welcome",
                title: "Welcome to Wht D Fork! 🍽️",
                subtitle: "\"Good food is the foundation of genuine happiness.\"\nHave a delightful meal with us today!",
                duration: 4000,
                buttonText: "View Menu",
                isActive: newStatus
            });
            console.log("// Moments: Created default document in Firestore.");
        }

        // Apply updated state to UI
        updateAdminUIState(newStatus, toggleBtn, badge);
    } catch (e) {
        console.e("// Moments Error: Failed to update Firestore status", e);
    } finally {
        toggleBtn.disabled = false;
    }
};

const MomentsEngine = {
    defaultMoment: {
        momentId: "everyday-welcome",
        name: "Everyday Warm Welcome",
        type: "welcome",
        theme: "welcome",
        title: "Welcome to Wht D Fork! 🍽️",
        subtitle: "\"Good food is the foundation of genuine happiness.\"\nHave a delightful meal with us today!",
        duration: 4000,
        buttonText: "View Menu",
        isActive: true
    },

    async renderActiveMoment(containerElement, onComplete) {
        let activeMoment = null;

        try {
            console.log("// Moments: Fetching active moment from Firestore...");
            const momentsRef = collection(db, "moments");
            // Look explicitly for isActive == true
            const q = query(momentsRef, where("isActive", "==", true), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                activeMoment = { id: docSnap.id, ...docSnap.data() };
            } else {
                console.log("// Moments: No active moment enabled in Firestore.");
            }
        } catch (e) {
            console.warn("// Moments Error: Failed to fetch from Firestore.", e);
        }

        // Strict Check: If no document found or explicitly inactive, do NOT render overlay on main page
        if (!activeMoment || activeMoment.isActive === false) {
            console.log("// Moments: Moment is disabled. Skipping overlay.");
            if (onComplete) onComplete();
            return;
        }

        // Remove existing overlay if present
        const existingOverlay = document.getElementById("momentOverlay");
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Build Full-screen Overlay
        const overlay = document.createElement("div");
        overlay.id = "momentOverlay";
        overlay.className = "moment-overlay";
        overlay.style.zIndex = "9999";
        overlay.innerHTML = `
            <div class="moment-content">
                <h1 class="moment-title">${activeMoment.title || ''}</h1>
                <p class="moment-subtitle">${(activeMoment.subtitle || '').replace(/\n/g, '<br>')}</p>
                <button class="moment-skip-btn" id="skipMomentBtn" type="button">${activeMoment.buttonText || 'View Menu'}</button>
            </div>
        `;

        document.body.appendChild(overlay);

        let transitionDismissed = false;

        const dismissOverlay = () => {
            if (transitionDismissed) return;
            transitionDismissed = true;
            overlay.classList.add("fade-out");
            setTimeout(() => {
                if (overlay && overlay.parentNode) {
                    overlay.remove();
                }
                if (onComplete) onComplete();
            }, 400);
        };

        const timer = setTimeout(dismissOverlay, activeMoment.duration || 4000);

        const skipBtn = overlay.querySelector("#skipMomentBtn");
        if (skipBtn) {
            skipBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                clearTimeout(timer);
                dismissOverlay();
            });
        }
    }
};

// Expose to window for inline handlers
window.MomentsEngine = MomentsEngine;

export default MomentsEngine;