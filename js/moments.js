// js/moments.js
import { db } from "./firebase-config.js";
import { collection, query, where, getDocs, limit, doc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Helper to dynamically load Lottie Web player if needed
function loadLottieScript() {
    return new Promise((resolve) => {
        if (window.lottie) {
            resolve();
            return;
        }
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js";
        script.onload = () => resolve();
        document.head.appendChild(script);
    });
}

// Sync Admin UI with Firestore state
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
            populateAdminForm(docData);
        } else {
            updateAdminUIState(true, toggleBtn, badge);
        }
    } catch (e) {
        console.error("// Moments Error: Failed to sync Admin UI state", e);
    }
};

// Populate admin inputs with saved moment parameters
function populateAdminForm(data) {
    if (document.getElementById("momentTitleInput")) document.getElementById("momentTitleInput").value = data.title || "";
    if (document.getElementById("momentSubtitleInput")) document.getElementById("momentSubtitleInput").value = data.subtitle || "";
    if (document.getElementById("momentThemeSelect")) document.getElementById("momentThemeSelect").value = data.theme || "welcome";
    if (document.getElementById("momentLottieInput")) document.getElementById("momentLottieInput").value = data.lottieUrl || "";
    if (document.getElementById("momentImageInput")) document.getElementById("momentImageInput").value = data.imageUrl || "";
    if (document.getElementById("momentAudioInput")) document.getElementById("momentAudioInput").value = data.audioUrl || "";
    if (document.getElementById("momentDurationInput")) document.getElementById("momentDurationInput").value = data.duration || 4000;
}

// Helper function to keep UI tags and action buttons consistent
function updateAdminUIState(isActive, toggleBtn, badge) {
    if (isActive) {
        toggleBtn.innerText = "Deactivate";
        toggleBtn.classList.add("deactivate-btn");
        toggleBtn.classList.remove("activate-btn");
        
        if (badge) {
            badge.innerText = "ACTIVE";
            badge.style.display = "inline-block";
        }
    } else {
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
        console.error("// Moments Error: toggleMomentBtn element not found in DOM");
        return;
    }

    toggleBtn.disabled = true;

    const isCurrentlyActive = toggleBtn.innerText.trim() === "Deactivate";
    const newStatus = !isCurrentlyActive;

    try {
        console.log(`// Moments: Setting active status to ${newStatus} in Firestore...`);

        const momentsRef = collection(db, "moments");
        const querySnapshot = await getDocs(momentsRef);

        const momentData = getAdminFormValues(newStatus);

        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            await updateDoc(doc(db, "moments", docSnap.id), momentData);
            console.log("// Moments: Firestore updated successfully.");
        } else {
            const defaultDocRef = doc(momentsRef, "everyday-welcome");
            await setDoc(defaultDocRef, { momentId: "everyday-welcome", ...momentData });
            console.log("// Moments: Created default document in Firestore.");
        }

        updateAdminUIState(newStatus, toggleBtn, badge);
    } catch (e) {
        console.error("// Moments Error: Failed to update Firestore status", e);
    } finally {
        toggleBtn.disabled = false;
    }
};

// Reads current field values from admin inputs
function getAdminFormValues(isActiveState) {
    return {
        title: document.getElementById("momentTitleInput")?.value || "Welcome to Wht D Fork! 🍽️",
        subtitle: document.getElementById("momentSubtitleInput")?.value || "Good food is the foundation of genuine happiness.",
        theme: document.getElementById("momentThemeSelect")?.value || "welcome",
        lottieUrl: document.getElementById("momentLottieInput")?.value || "",
        imageUrl: document.getElementById("momentImageInput")?.value || "",
        audioUrl: document.getElementById("momentAudioInput")?.value || "",
        duration: parseInt(document.getElementById("momentDurationInput")?.value, 10) || 4000,
        buttonText: "View Menu",
        isActive: isActiveState
    };
}

// Save Moment configurations from Admin form
window.saveMomentConfig = async function() {
    const saveBtn = document.getElementById("saveMomentConfigBtn");
    if (saveBtn) saveBtn.disabled = true;

    try {
        console.log("// Moments: Saving moment configuration...");
        const momentsRef = collection(db, "moments");
        const querySnapshot = await getDocs(momentsRef);

        const toggleBtn = document.getElementById("toggleMomentBtn");
        const currentActiveStatus = toggleBtn ? toggleBtn.innerText.trim() === "Deactivate" : true;

        const momentData = getAdminFormValues(currentActiveStatus);

        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            await updateDoc(doc(db, "moments", docSnap.id), momentData);
        } else {
            const defaultDocRef = doc(momentsRef, "everyday-welcome");
            await setDoc(defaultDocRef, { momentId: "everyday-welcome", ...momentData });
        }
        alert("Moment configuration saved successfully!");
    } catch (e) {
        console.error("// Moments Error: Failed to save configuration", e);
        alert("Failed to save configuration.");
    } finally {
        if (saveBtn) saveBtn.disabled = false;
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
        lottieUrl: "https://assets2.lottiefiles.com/packages/lf20_u4yrau.json",
        imageUrl: "",
        audioUrl: "",
        isActive: true
    },

    async renderActiveMoment(containerElement, onComplete) {
        let activeMoment = null;

        try {
            console.log("// Moments: Fetching active moment from Firestore...");
            const momentsRef = collection(db, "moments");
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

        if (!activeMoment || activeMoment.isActive === false) {
            console.log("// Moments: Moment is disabled. Skipping overlay.");
            if (onComplete) onComplete();
            return;
        }

        const existingOverlay = document.getElementById("momentOverlay");
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Build Full-screen Overlay with Theme Class FIRST so elements exist in scope
        const overlay = document.createElement("div");
        overlay.id = "momentOverlay";
        overlay.className = `moment-overlay theme-${activeMoment.theme || 'welcome'}`;
        overlay.style.zIndex = "9999";

        let audioElementHtml = "";
        if (activeMoment.audioUrl) {
            audioElementHtml = `<audio id="momentAudio" src="${activeMoment.audioUrl}" preload="auto"></audio>`;
        }

        let mediaImageHtml = "";
        if (activeMoment.imageUrl) {
            mediaImageHtml = `<img src="${activeMoment.imageUrl}" class="moment-banner-img" alt="Occasion Banner" />`;
        }

        overlay.innerHTML = `
            ${audioElementHtml}
            <div class="moment-content-card">
                <div id="lottieContainer" class="lottie-container"></div>
                ${mediaImageHtml}
                <h1 class="moment-title">${activeMoment.title || ''}</h1>
                <p class="moment-subtitle">${(activeMoment.subtitle || '').replace(/\n/g, '<br>')}</p>
                <button class="moment-skip-btn" id="skipMomentBtn" type="button">${activeMoment.buttonText || 'View Menu'}</button>
            </div>
        `;

        document.body.appendChild(overlay);
        console.log("// MomentsEngine: Overlay appended to DOM successfully.");

        // Attempt Audio Playback with Autoplay Fallback handling
        if (activeMoment.audioUrl) {
            const audioEl = overlay.querySelector("#momentAudio");
            if (audioEl) {
                audioEl.play().then(() => {
                    console.log("// MomentsEngine: Audio playing successfully.");
                }).catch((error) => {
                    console.warn("// MomentsEngine Warning: Autoplay blocked by browser. Audio will play on first click/tap.", error);
                    const playOnUserInteraction = () => {
                        audioEl.play().catch(e => console.error("// MomentsEngine Error: Manual play failed", e));
                        document.removeEventListener("click", playOnUserInteraction);
                        document.removeEventListener("touchstart", playOnUserInteraction);
                    };
                    document.addEventListener("click", playOnUserInteraction);
                    document.addEventListener("touchstart", playOnUserInteraction);
                });
            }
        }

        // Initialize Animation (Supports both Lottie JSON and direct image/SVG animations)
        if (activeMoment.lottieUrl) {
            const lottieContainer = overlay.querySelector("#lottieContainer");
            if (lottieContainer) {
                const isJsonUrl = activeMoment.lottieUrl.toLowerCase().includes(".json");
                
                if (isJsonUrl) {
                    console.log("// MomentsEngine: Loading Lottie JSON animation from URL");
                    await loadLottieScript();
                    if (window.lottie) {
                        window.lottie.loadAnimation({
                            container: lottieContainer,
                            renderer: "svg",
                            loop: true,
                            autoplay: true,
                            path: activeMoment.lottieUrl
                        });
                    } else {
                        console.error("// MomentsEngine Error: Lottie library failed to load");
                    }
                } else {
                    console.log("// MomentsEngine: Loading graphic animation asset (SVG/GIF/Image)");
                    lottieContainer.innerHTML = `<img src="${activeMoment.lottieUrl}" style="max-width: 100%; max-height: 150px; object-fit: contain;" alt="Animation Asset" />`;
                }
            }
        }

        let transitionDismissed = false;

        const dismissOverlay = () => {
            if (transitionDismissed) return;
            transitionDismissed = true;
            overlay.classList.add("fade-out");

            const audioEl = document.getElementById("momentAudio");
            if (audioEl) {
                audioEl.pause();
                audioEl.currentTime = 0;
            }

            setTimeout(() => {
                if (overlay && overlay.parentNode) {
                    overlay.remove();
                }
                if (onComplete) onComplete();
            }, 500);
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

// Bind admin action button event listeners safely
document.addEventListener("DOMContentLoaded", () => {
// Run on customer menu page
const menuContainer = document.getElementById("dynamicMenuContainer");
if (menuContainer) {
    MomentsEngine.renderActiveMoment(menuContainer);
}

// Run on admin preview page
const momentsContainer = document.getElementById("momentsContainer");
if (momentsContainer) {
    MomentsEngine.renderActiveMoment(momentsContainer);
}

    if (document.getElementById("toggleMomentBtn")) {
        window.syncMomentAdminUI();
        
        // Ensure click listener is bound programmatically in case HTML onclick is missing
        const toggleBtn = document.getElementById("toggleMomentBtn");
        if (toggleBtn && !toggleBtn.hasAttribute("data-bound")) {
            toggleBtn.setAttribute("data-bound", "true");
            toggleBtn.addEventListener("click", window.toggleMomentStatus);
        }
    }

    const saveBtn = document.getElementById("saveMomentConfigBtn");
    if (saveBtn && !saveBtn.hasAttribute("data-bound")) {
        saveBtn.setAttribute("data-bound", "true");
        saveBtn.addEventListener("click", window.saveMomentConfig);
    }
});

window.MomentsEngine = MomentsEngine;
export default MomentsEngine;