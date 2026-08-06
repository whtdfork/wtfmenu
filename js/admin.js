// js/admin.js
import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// DOM Elements
const userEmailDisplay = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const navItems = document.querySelectorAll(".nav-item");
const tabContents = document.querySelectorAll(".tab-content");
const pageTitle = document.getElementById("pageTitle");

// Categories list
const categories = ["cover", "pizza", "momos", "desserts", "thankyou"];
const selectedFiles = {};

// 1. Auth Guard & Initial Data Fetch
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Redirect to login if unauthenticated
        window.location.href = "../admin/login.html";
    } else {
        // Log component status
        console.log("// Auth Guard Verified: Logged in as", user.email);
        userEmailDisplay.textContent = user.email;
        
        // Load existing menu images from Firestore
        await loadExistingMenu();
    }
});

// 2. Logout Handler
logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
        console.log("// User logged out successfully");
        window.location.href = "../admin/login.html";
    } catch (error) {
        console.error("// Logout Error:", error);
        alert("Logout failed: " + error.message);
    }
});

// 3. Tab Navigation Handler
navItems.forEach((button) => {
    button.addEventListener("click", () => {
        const targetTab = button.getAttribute("data-tab");

        navItems.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        tabContents.forEach((content) => {
            if (content.id === `tab-${targetTab}`) {
                content.classList.add("active");
            } else {
                content.classList.remove("active");
            }
        });

        pageTitle.textContent = button.textContent.trim();
    });
});

// 4. Load Current Menu URLs from Firestore
async function loadExistingMenu() {
    try {
        const menuDocRef = doc(db, "menu", "cards");
        const docSnap = await getDoc(menuDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            categories.forEach((cat) => {
                if (data[cat]) {
                    renderPreview(cat, data[cat]);
                }
            });
            console.log("// Menu metadata loaded from Firestore:", data);
        } else {
            console.log("// No menu metadata document found in Firestore yet.");
        }
    } catch (error) {
        console.error("// Error fetching menu data:", error);
    }
}

// 5. Setup Event Listeners for Upload Cards
categories.forEach((cat) => {
    const fileInput = document.getElementById(`file-${cat}`);
    const saveBtn = document.getElementById(`btn-${cat}`);

    if (!fileInput || !saveBtn) return;

    // Handle Local File Selection & Local Preview
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFiles[cat] = file;
            saveBtn.disabled = false;
            
            // Show temporary local preview
            const reader = new FileReader();
            reader.onload = (event) => {
                renderPreview(cat, event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle Replace & Save Click
    saveBtn.addEventListener("click", async () => {
        await uploadMenuImage(cat);
    });
});

// 6. Upload Image to Storage & Update Firestore
async function uploadMenuImage(category) {
    const file = selectedFiles[category];
    const saveBtn = document.getElementById(`btn-${category}`);
    const statusMsg = document.getElementById(`status-${category}`);

    if (!file) return;

    saveBtn.disabled = true;
    saveBtn.textContent = "Uploading...";
    statusMsg.className = "status-msg";
    statusMsg.textContent = "Saving to Firebase...";

    try {
        // Upload file to Firebase Storage under menu/category.jpg
        const fileExtension = file.name.split('.').pop();
        const storageRef = ref(storage, `menu/${category}.${fileExtension}`);
        
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        console.log(`// Storage Upload Success [${category}]:`, downloadURL);

        // Save download URL to Firestore in 'menu' collection, document 'cards'
        const menuDocRef = doc(db, "menu", "cards");
        await setDoc(menuDocRef, { [category]: downloadURL }, { merge: true });
        console.log(`// Firestore Updated [${category}]`);

        // UI Reset & Feedback
        saveBtn.textContent = "Replace & Save";
        saveBtn.disabled = true;
        statusMsg.className = "status-msg success";
        statusMsg.textContent = "Saved successfully!";
        
        delete selectedFiles[category];
    } catch (error) {
        console.error(`// Upload Error [${category}]:`, error);
        saveBtn.disabled = false;
        saveBtn.textContent = "Replace & Save";
        statusMsg.className = "status-msg error";
        statusMsg.textContent = "Failed to upload.";
    }
}

// Helper: Render Image in Card Preview Container
function renderPreview(category, imageSrc) {
    const previewContainer = document.getElementById(`preview-${category}`);
    if (previewContainer) {
        previewContainer.innerHTML = `<img src="${imageSrc}" alt="${category} menu">`;
    }
}