import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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
let momentsList = [];

// Helper: Normalize array order (0, 1, 2...) automatically before saving or rendering
function autoIndexPages(pages) {
    return pages.map((page, index) => ({
        ...page,
        order: index
    }));
}

// Helper: Safe Firebase Storage Deletion
async function safeDeleteStorageFile(storagePath) {
    if (!storagePath) return;
    try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
        console.log(`// Firebase Storage: Successfully deleted [${storagePath}]`);
    } catch (error) {
        console.warn(`// Firebase Storage Cleanup Warning: ${error.message}`);
    }
}

// 1. Auth Guard & Initial Data Fetch
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../admin/login.html";
    } else {
        console.log("// Auth Guard Verified: Logged in as", user.email);
        userEmailDisplay.textContent = user.email;
        
        await loadDynamicMenu();
        await loadExistingImages();
        await loadMoments();
        setupImageModal();
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
            loadExistingImages();
        }
        
        if (targetTab === "moments") {
            loadMoments();
        }
        
        if (targetTab === "moments-media") {
            loadMomentsMedia();
        }
        
        if (targetTab === "firebase-files") {
            loadFirebaseFiles();
        }
    });
});

// 4. Load Dynamic Menu Pages from Firestore
async function loadDynamicMenu() {
    try {
        const menuDocRef = doc(db, "menu", "dynamic_cards");
        const docSnap = await getDoc(menuDocRef);

        if (docSnap.exists() && docSnap.data().pages) {
            menuPages = autoIndexPages(docSnap.data().pages);
            console.log(`// Dynamic menu loaded with ${menuPages.length} pages.`);
        } else {
            menuPages = [
                { id: "page_1", order: 0, url: "", storagePath: "", uploadedBy: "", uploadedAt: "" }
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

    menuPages = autoIndexPages(menuPages);

    gridContainer.innerHTML = menuPages.map((page, index) => `
        <div class="menu-card" id="card-${page.id}" style="border: 1px solid #ddd; padding: 16px; border-radius: 8px; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.85rem; background: #007bff; color: #fff; padding: 3px 8px; border-radius: 4px; font-weight: bold;">Slot ${index + 1}</span>
                    <select onchange="window.movePage('${page.id}', parseInt(this.value))" style="font-size: 0.8rem; padding: 3px; border-radius: 4px; border: 1px solid #ccc;">
                        ${menuPages.map((_, targetIndex) => `
                            <option value="${targetIndex}" ${targetIndex === index ? "selected" : ""}>
                                Move to Position ${targetIndex + 1}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                ${menuPages.length > 1 ? `<button onclick="window.deletePage('${page.id}')" style="color: #dc3545; border: none; background: none; cursor: pointer; font-weight: bold;">🗑️ Delete</button>` : ''}
            </div>

            <div class="image-preview" style="min-height: 160px; background: #f8f9fa; display: flex; align-items: center; justify-content: center; border: 1px dashed #ccc; border-radius: 6px; overflow: hidden; cursor: pointer;" onclick="window.openImageModal('${page.url}')">
                ${page.url ? `<img src="${page.url}" alt="Slot ${index + 1}" style="width: 100%; height: 160px; object-fit: cover; transition: transform 0.2s;" title="Click to view full screen" />` : '<span class="placeholder-text" style="color: #6c757d;">No image uploaded (Click Choose Image)</span>'}
            </div>

            <div class="card-meta" style="margin: 10px 0; font-size: 0.85rem; color: #555;">
                ${page.uploadedBy ? `<small>By: ${page.uploadedBy}<br>Date:${page.uploadedAt}</small>` : '<small>Status: Empty slot</small>'}
            </div>

            <div class="card-actions" style="display: flex; gap: 8px;">
                <input type="file" id="file-${page.id}" accept="image/*" class="file-input" style="display: none;" onchange="window.handleFileSelect('${page.id}', event)" />
                <button class="upload-btn" onclick="document.getElementById('file-${page.id}').click()" style="padding: 6px 12px; cursor: pointer;">Choose Image</button>
                <button class="save-btn" id="btn-${page.id}" disabled onclick="window.uploadPageImage('${page.id}')" style="padding: 6px 12px; cursor: pointer;">Replace & Save</button>
            </div>
            <div class="status-msg" id="status-${page.id}" style="font-size: 0.8rem; margin-top: 6px; color: #28a745;"></div>
        </div>
    `).join("");

    const addBtn = document.getElementById("addPageBtn");
    if (addBtn) {
        addBtn.disabled = menuPages.length >= MAX_PAGES;
        addBtn.textContent = menuPages.length >= MAX_PAGES ? `Max Limit Reached (${MAX_PAGES}/${MAX_PAGES})` : `＋ Add New Page (${menuPages.length}/${MAX_PAGES})`;
        addBtn.style.opacity = menuPages.length >= MAX_PAGES ? "0.6" : "1";
        addBtn.style.cursor = menuPages.length >= MAX_PAGES ? "not-allowed" : "pointer";
    }
}

// 6. Global Window Handlers
window.addPage = async function() {
    if (menuPages.length >= MAX_PAGES) return;

    const newPage = {
        id: `page_${Date.now()}`,
        order: menuPages.length,
        url: "",
        storagePath: "",
        uploadedBy: "",
        uploadedAt: ""
    };

    menuPages.push(newPage);
    if (typeof savePagesToFirestore === "function") {
        await savePagesToFirestore();
    }
    renderMenuGrid();
};

window.movePage = async function(pageId, newIndex) {
    const currentIndex = menuPages.findIndex(p => p.id === pageId);
    if (currentIndex === -1 || newIndex === currentIndex) return;

    const [movedPage] = menuPages.splice(currentIndex, 1);
    menuPages.splice(newIndex, 0, movedPage);

    if (typeof savePagesToFirestore === "function") {
        await savePagesToFirestore();
    }
    renderMenuGrid();
};

window.deletePage = async function(pageId) {
    if (!confirm("Are you sure you want to delete this menu page?")) return;

    const pageToDelete = menuPages.find(p => p.id === pageId);

    if (pageToDelete && pageToDelete.storagePath) {
        await safeDeleteStorageFile(pageToDelete.storagePath);
    }

    menuPages = menuPages.filter(p => p.id !== pageId);
    delete selectedFiles[pageId];

    if (typeof savePagesToFirestore === "function") {
        await savePagesToFirestore();
    }
    renderMenuGrid();
    if (typeof loadExistingImages === "function") {
        await loadExistingImages();
    }
};

window.handleFileSelect = function(pageId, event) {
    const file = event.target.files[0];
    if (file) {
        selectedFiles[pageId] = file;
        const saveBtn = document.getElementById(`btn-${pageId}`);
        if (saveBtn) saveBtn.disabled = false;

        const reader = new FileReader();
        reader.onload = (e) => {
            const cardElement = document.getElementById(`card-${pageId}`);
            if (cardElement) {
                const previewContainer = cardElement.querySelector(".image-preview");
                if (previewContainer) {
                    previewContainer.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 160px; object-fit: cover;" title="Click to view full screen" />`;
                    previewContainer.onclick = () => window.openImageModal(e.target.result);
                }
            }
        };
        reader.readAsDataURL(file);
    }
};

window.uploadPageImage = async function(pageId) {
    const file = selectedFiles[pageId];
    const user = auth.currentUser;
    if (!file || !user) return;

    const saveBtn = document.getElementById(`btn-${pageId}`);
    const statusMsg = document.getElementById(`status-${pageId}`);
    if (saveBtn) saveBtn.disabled = true;
    if (statusMsg) statusMsg.textContent = "Uploading...";

    const page = menuPages.find(p => p.id === pageId);

    if (page && page.storagePath) {
        await safeDeleteStorageFile(page.storagePath);
    }

    const timestamp = Date.now();
    const storagePath = `menu/${pageId}_${timestamp}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        if (page) {
            page.url = downloadURL;
            page.uploadedBy = user.email;
            page.uploadedAt = new Date().toLocaleString();
            page.storagePath = storagePath;
        }

        if (typeof savePagesToFirestore === "function") {
            await savePagesToFirestore();
        }
        if (statusMsg) statusMsg.textContent = "Saved successfully!";
        renderMenuGrid();
        if (typeof loadExistingImages === "function") {
            await loadExistingImages();
        }

    } catch (error) {
        console.error("// Error uploading image:", error);
        if (statusMsg) statusMsg.textContent = "Upload failed.";
    }
};

// 7. Full-Screen Dialog Lightbox Setup
function setupImageModal() {
    if (document.getElementById("imagePreviewModal")) return;

    const modalHTML = `
        <div id="imagePreviewModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10000; justify-content: center; align-items: center; cursor: pointer;" onclick="window.closeImageModal()">
            <span style="position: absolute; top: 20px; right: 30px; color: #fff; font-size: 2rem; font-weight: bold; cursor: pointer;">&times;</span>
            <img id="modalPreviewImage" src="" style="max-width: 90%; max-height: 90%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); object-fit: contain;" />
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
}

window.openImageModal = function(imgSrc) {
    if (!imgSrc) return;
    const modal = document.getElementById("imagePreviewModal");
    const modalImg = document.getElementById("modalPreviewImage");
    if (modal && modalImg) {
        modalImg.src = imgSrc;
        modal.style.display = "flex";
    }
};

window.closeImageModal = function() {
    const modal = document.getElementById("imagePreviewModal");
    if (modal) {
        modal.style.display = "none";
    }
};

// Dummy placeholders if not defined elsewhere
async function loadExistingImages() {}
async function loadMoments() {}

// Firebase Files Tab Logic
async function loadFirebaseFiles() {
    const grid = document.getElementById("firebaseFilesGrid");
    if (!grid) return;
    
    grid.innerHTML = '<p class="muted">Loading files...</p>';
    
    try {
        const listRef = ref(storage, 'general_files/');
        const res = await listAll(listRef);
        
        if (res.items.length === 0) {
            grid.innerHTML = '<p class="muted">No files uploaded yet.</p>';
            return;
        }
        
        grid.innerHTML = "";
        for (const itemRef of res.items) {
            const url = await getDownloadURL(itemRef);
            const fileName = itemRef.name;
            
            const card = document.createElement("div");
            card.style = "border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #f9f9f9; word-break: break-all;";
            card.innerHTML = `
                <p style="font-weight: 600; font-size: 0.9rem; margin-bottom: 8px;">${fileName}</p>
                <a href="${url}" target="_blank" style="display: block; margin-bottom: 10px; color: #007bff; text-decoration: none; font-size: 0.85rem;">View File</a>
                <button onclick="window.deleteFirebaseFile('general_files/${fileName}')" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; width: 100%;">Delete File</button>
            `;
            grid.appendChild(card);
        }
    } catch (error) {
        console.error("// Error loading Firebase files:", error);
        grid.innerHTML = `<p style="color: red;">Error loading files: ${error.message}</p>`;
    }
}

window.deleteFirebaseFile = async function(storagePath) {
    if (!confirm("Are you sure you want to delete this file? This cannot be undone.")) return;
    
    try {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
        console.log(`// Firebase Storage: Successfully deleted [${storagePath}]`);
        await loadFirebaseFiles();
    } catch (error) {
        console.error("// Error deleting file:", error);
        alert("Failed to delete file: " + error.message);
    }
};

async function loadMomentsMedia() {
    const grid = document.getElementById("momentsMediaGrid");
    if (!grid) return;

    grid.innerHTML = '<p class="muted">Loading moments media library...</p>';

    try {
        const listRef = ref(storage, 'moments/');
        const res = await listAll(listRef);

        if (res.items.length === 0) {
            grid.innerHTML = '<p class="muted">No moments media uploaded yet.</p>';
            return;
        }

        grid.innerHTML = "";
        for (const itemRef of res.items) {
            const url = await getDownloadURL(itemRef);
            const fileName = itemRef.name;

            const card = document.createElement("div");
            card.style = "border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #f9f9f9; word-break: break-all;";
            card.innerHTML = `
                <p style="font-weight: 600; font-size: 0.9rem; margin-bottom: 8px;">${fileName}</p>
                <a href="${url}" target="_blank" style="display: block; margin-bottom: 10px; color: #007bff; text-decoration: none; font-size: 0.85rem;">View File</a>
                <button onclick="window.deleteMomentsMediaFile('moments/${fileName}')" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; width: 100%;">Delete File</button>
            `;
            grid.appendChild(card);
        }
    } catch (error) {
        console.error("// Error loading moments media:", error);
        grid.innerHTML = `<p style="color: red;">Error loading moments media: ${error.message}</p>`;
    }
}

window.deleteMomentsMediaFile = async function(storagePath) {
    if (!confirm("Delete this moments media file?")) return;

    try {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
        console.log(`// Firebase Storage: Successfully deleted [${storagePath}]`);
        await loadMomentsMedia();
    } catch (error) {
        console.error("// Error deleting moments file:", error);
        alert("Failed to delete file: " + error.message);
    }
};

function initMomentsMediaUpload() {
    const uploadBtn = document.getElementById("uploadMomentsMediaBtn");
    const fileInput = document.getElementById("momentsMediaFileInput");
    const statusDiv = document.getElementById("momentsMediaUploadStatus");

    if (!uploadBtn) {
        console.warn("// uploadMomentsMediaBtn not found in DOM");
        return;
    }

    uploadBtn.addEventListener("click", async () => {
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert("Please select a file first.");
            return;
        }

        const file = fileInput.files[0];
        const storagePath = `moments/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);

        if (statusDiv) {
            statusDiv.textContent = "Uploading...";
            statusDiv.style.color = "#007bff";
        }

        try {
            console.log("// uploading moments media file", file.name, storagePath);
            await uploadBytes(storageRef, file);
            if (statusDiv) {
                statusDiv.textContent = "Upload successful!";
                statusDiv.style.color = "#28a745";
            }
            fileInput.value = "";
            await loadMomentsMedia();
        } catch (error) {
            console.error("// Error uploading moments media file:", error);
            if (statusDiv) {
                statusDiv.textContent = "Upload failed: " + (error.message || error.code || "Unknown error");
                statusDiv.style.color = "#dc3545";
            }
            alert("Moments file upload failed: " + (error.message || error.code || "Check console for details."));
        }
    });
}

function initFirebaseFileUpload() {
    const uploadGeneralFileBtn = document.getElementById("uploadGeneralFileBtn");
    const fileInput = document.getElementById("generalFileInput");
    const statusDiv = document.getElementById("generalFileUploadStatus");

    console.log("// initFirebaseFileUpload", {
        uploadGeneralFileBtn: !!uploadGeneralFileBtn,
        fileInput: !!fileInput,
        statusDiv: !!statusDiv,
    });

    if (!uploadGeneralFileBtn) {
        console.warn("// uploadGeneralFileBtn not found in DOM");
        return;
    }

    uploadGeneralFileBtn.addEventListener("click", async () => {
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert("Please select a file to upload first.");
            return;
        }
        
        const file = fileInput.files[0];
        const storagePath = `general_files/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        
        if (statusDiv) {
            statusDiv.textContent = "Uploading...";
            statusDiv.style.color = "#007bff";
        }
        
        try {
            await uploadBytes(storageRef, file);
            if (statusDiv) {
                statusDiv.textContent = "Upload successful!";
                statusDiv.style.color = "#28a745";
            }
            fileInput.value = "";
            await loadFirebaseFiles();
        } catch (error) {
            console.error("// Error uploading general file:", error);
            if (statusDiv) {
                statusDiv.textContent = "Upload failed: " + error.message;
                statusDiv.style.color = "#dc3545";
            }
        }
        
        setTimeout(() => {
            if (statusDiv && statusDiv.textContent.includes("successful")) {
                statusDiv.textContent = "";
            }
        }, 3000);
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initFirebaseFileUpload();
        initMomentsMediaUpload();
    });
} else {
    initFirebaseFileUpload();
    initMomentsMediaUpload();
}
