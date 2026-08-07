// js/admin.js
import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// DOM Elements
const userEmailDisplay = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const navItems = document.querySelectorAll(".nav-item");
const tabContents = document.querySelectorAll(".tab-content");
const pageTitle = document.getElementById("pageTitle");

// Dynamic Limits & State
const MAX_PAGES = 10;
let menuPages = [];
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
        
        // Load dynamic menu pages and overall gallery
        await loadDynamicMenu();
        await loadExistingImages();
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

        if (targetTab === "gallery") {
            loadExistingImages();
        }
    });
});

// 4. Load Dynamic Menu Pages from Firestore & Sort by Order
async function loadDynamicMenu() {
    try {
        const menuDocRef = doc(db, "menu", "dynamic_cards");
        const docSnap = await getDoc(menuDocRef);

        if (docSnap.exists() && docSnap.data().pages) {
            menuPages = docSnap.data().pages;
            // Sort explicitly by order position
            menuPages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            console.log(`// Dynamic menu loaded & ordered with ${menuPages.length} pages.`);
        } else {
            // Default initial state with 1 cover card if database is empty
            menuPages = [
                { id: "page_1", order: 0, title: "Cover Page", url: "", uploadedBy: "", uploadedAt: "" }
            ];
            console.log("// No dynamic cards document found in Firestore. Created default cover card.");
        }

        renderMenuGrid();
    } catch (error) {
        console.error("// Error fetching dynamic menu data:", error);
    }
}

// 5. Render Dynamic Menu Grid UI
function renderMenuGrid() {
    const gridContainer = document.getElementById("menuGridContainer");
    if (!gridContainer) return;

    // Re-index order before rendering to ensure 0-based sequence
    menuPages.forEach((page, index) => {
        page.order = index;
    });

    gridContainer.innerHTML = menuPages.map((page, index) => `
        <div class="menu-card" id="card-${page.id}" style="border: 1px solid #ddd; padding: 16px; border-radius: 8px; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 0.8rem; background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #495057;">Page ${index + 1}</span>
                <input type="text" value="${page.title}" class="page-title-input" 
                       onchange="window.updatePageTitle('${page.id}', this.value)" 
                       style="font-weight: bold; font-size: 0.95rem; width: 55%; padding: 4px; border: 1px solid #ccc; border-radius: 4px;" />
                ${menuPages.length > 1 ? `<button onclick="window.deletePage('${page.id}')" style="color: #dc3545; border: none; background: none; cursor: pointer; font-weight: bold;">🗑️ Delete</button>` : ''}
            </div>

            <div class="image-preview" style="min-height: 150px; background: #f8f9fa; display: flex; align-items: center; justify-content: center; border: 1px dashed #ccc; border-radius: 4px; overflow: hidden;">
                ${page.url ? `<img src="${page.url}" alt="${page.title}" style="width: 100%; height: 160px; object-fit: cover;" />` : '<span class="placeholder-text" style="color: #6c757d;">No image loaded</span>'}
            </div>

            <div class="card-meta" style="margin: 10px 0; font-size: 0.85rem; color: #555;">
                ${page.uploadedBy ? `<small>By: ${page.uploadedBy}<br>Date: ${page.uploadedAt}</small>` : '<small>Not uploaded yet</small>'}
            </div>

            <div class="card-actions" style="display: flex; gap: 8px;">
                <input type="file" id="file-${page.id}" accept="image/*" class="file-input" style="display: none;" onchange="window.handleFileSelect('${page.id}', event)" />
                <button class="upload-btn" onclick="document.getElementById('file-${page.id}').click()" style="padding: 6px 12px; cursor: pointer;">Choose Image</button>
                <button class="save-btn" id="btn-${page.id}" disabled onclick="window.uploadPageImage('${page.id}')" style="padding: 6px 12px; cursor: pointer;">Replace & Save</button>
            </div>
            <div class="status-msg" id="status-${page.id}" style="font-size: 0.8rem; margin-top: 6px; color: #28a745;"></div>
        </div>
    `).join("");

    // Update Add Page Button State
    const addBtn = document.getElementById("addPageBtn");
    if (addBtn) {
        addBtn.disabled = menuPages.length >= MAX_PAGES;
        addBtn.textContent = menuPages.length >= MAX_PAGES ? `Max Limit Reached (${MAX_PAGES}/${MAX_PAGES})` : `＋ Add New Page (${menuPages.length}/${MAX_PAGES})`;
        addBtn.style.opacity = menuPages.length >= MAX_PAGES ? "0.6" : "1";
        addBtn.style.cursor = menuPages.length >= MAX_PAGES ? "not-allowed" : "pointer";
    }
}

// 6. Global Window Handlers for Dynamic Card Interaction
window.addPage = async function() {
    if (menuPages.length >= MAX_PAGES) return;

    const newPage = {
        id: `page_${Date.now()}`,
        order: menuPages.length, // Assign sequential order
        title: `Menu Page ${menuPages.length + 1}`,
        url: "",
        uploadedBy: "",
        uploadedAt: ""
    };

    menuPages.push(newPage);
    await savePagesToFirestore();
    renderMenuGrid();
};

window.updatePageTitle = async function(pageId, newTitle) {
    const page = menuPages.find(p => p.id === pageId);
    if (page) {
        page.title = newTitle;
        await savePagesToFirestore();
        console.log(`// Updated page title for [${pageId}]: ${newTitle}`);
    }
};

// Edited: Safely delete storage object using storagePath reference
window.deletePage = async function(pageId) {
    if (!confirm("Are you sure you want to delete this menu page?")) return;

    const pageToDelete = menuPages.find(p => p.id === pageId);

    // Delete image from Storage using clean path reference
    if (pageToDelete && pageToDelete.storagePath) {
        try {
            const oldStorageRef = ref(storage, pageToDelete.storagePath);
            await deleteObject(oldStorageRef);
            console.log(`// Deleted image from Firebase Storage: ${pageToDelete.storagePath}`);
        } catch (storageErr) {
            console.warn("// Could not delete image from Storage or file missing:", storageErr);
        }
    }

    // Filter out page and cleanup selection
    menuPages = menuPages.filter(p => p.id !== pageId);
    delete selectedFiles[pageId];

    // Re-index remaining pages order sequentially (0, 1, 2...)
    menuPages.forEach((page, index) => {
        page.order = index;
    });

    await savePagesToFirestore();
    renderMenuGrid();
    await loadExistingImages();
    console.log(`// Page deleted [${pageId}]. Remaining count: ${menuPages.length}`);
};

window.handleFileSelect = function(pageId, event) {
    const file = event.target.files[0];
    if (file) {
        selectedFiles[pageId] = file;
        const saveBtn = document.getElementById(`btn-${pageId}`);
        if (saveBtn) saveBtn.disabled = false;

        // Show temporary local preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const cardElement = document.getElementById(`card-${pageId}`);
            if (cardElement) {
                const previewContainer = cardElement.querySelector(".image-preview");
                if (previewContainer) {
                    previewContainer.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 160px; object-fit: cover;" />`;
                }
            }
        };
        reader.readAsDataURL(file);
    }
};

// Safely replace old file using clean storagePath reference
window.uploadPageImage = async function(pageId) {
    const file = selectedFiles[pageId];
    const user = auth.currentUser;
    if (!file || !user) return;

    const saveBtn = document.getElementById(`btn-${pageId}`);
    const statusMsg = document.getElementById(`status-${pageId}`);
    if (saveBtn) saveBtn.disabled = true;
    if (statusMsg) statusMsg.textContent = "Uploading...";

    const page = menuPages.find(p => p.id === pageId);

    // Delete existing old image from Storage before uploading new image to prevent duplicates
    if (page && page.storagePath) {
        try {
            const oldStorageRef = ref(storage, page.storagePath);
            await deleteObject(oldStorageRef);
            console.log(`// Deleted existing old image from Firebase Storage: ${page.storagePath}`);
        } catch (storageErr) {
            console.warn("// Old image delete failed or file not found in Storage:", storageErr);
        }
    }

    const timestamp = Date.now();
    const storagePath = `menu/${pageId}_${timestamp}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    try {
        // 1. Storage Upload
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // 2. Local State Update
        if (page) {
            page.url = downloadURL;
            page.uploadedBy = user.email;
            page.uploadedAt = new Date().toLocaleString();
            page.storagePath = storagePath;
        }

        // 3. Firestore Sync
        await savePagesToFirestore();
        console.log(`// Storage & Firestore Updated [${pageId}]: Saved by ${user.email}`);

        if (statusMsg) statusMsg.textContent = "Saved successfully!";
        renderMenuGrid();
        await loadExistingImages();

    } catch (error) {
        console.error("// Error uploading page image:", error);
        if (statusMsg) statusMsg.textContent = "Upload failed.";
    }
};

// Helper: Sync Dynamic Pages Array to Firestore with explicit ordering
async function savePagesToFirestore() {
    const user = auth.currentUser;
    const menuDocRef = doc(db, "menu", "dynamic_cards");

    // Ensure array is sorted by order before saving
    menuPages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    await setDoc(menuDocRef, {
        pages: menuPages,
        lastUpdatedBy: user ? user.email : "system",
        lastUpdatedAt: serverTimestamp()
    }, { merge: true });
}

// Function to fetch and render overall image audit gallery tab
async function loadExistingImages() {
    try {
        const menuMetaRef = doc(db, "menu", "dynamic_cards");
        const docSnap = await getDoc(menuMetaRef);

        const galleryContainer = document.getElementById("imageGallery");
        if (!galleryContainer) return;

        if (docSnap.exists() && docSnap.data().pages) {
            const pagesWithImages = docSnap.data().pages.filter(p => p.url);
            console.log(`// Gallery loaded ${pagesWithImages.length} uploaded images.`);

            if (pagesWithImages.length === 0) {
                galleryContainer.innerHTML = "<p class='muted'>No uploaded images present yet.</p>";
                return;
            }

            galleryContainer.innerHTML = pagesWithImages.map(img => `
                <div class="image-card" id="${img.id}" style="border: 1px solid #ddd; padding: 10px; border-radius: 8px; background: #fff;">
                    <img src="${img.url}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px;" />
                    <p style="margin: 8px 0 4px 0;"><strong>Title:</strong> ${img.title} (Page ${img.order + 1})</p>
                    <p style="margin: 0;"><small><strong>By:</strong> ${img.uploadedBy}</small></p>
                    <p style="margin: 0;"><small><strong>Date:</strong> ${img.uploadedAt}</small></p>
                </div>
            `).join("");
        } else {
            galleryContainer.innerHTML = "<p class='muted'>No uploaded images present yet.</p>";
            console.log("// No menu metadata document found in Firestore yet.");
        }
    } catch (error) {
        console.error("// Error loading gallery images:", error);
    }
}