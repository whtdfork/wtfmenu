import { auth, db, storage } from "../firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const MAX_PAGES = 10;
let menuPages = [];
const selectedFiles = {};

function autoIndexPages(pages) {
    return pages.map((page, index) => ({
        ...page,
        order: index
    }));
}

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

export async function loadDynamicMenu() {
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

// Global Window Handlers for inline HTML onclick binding
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
    if (typeof window.savePagesToFirestore === "function") {
        await window.savePagesToFirestore();
    }
    renderMenuGrid();
};

window.movePage = async function(pageId, newIndex) {
    const currentIndex = menuPages.findIndex(p => p.id === pageId);
    if (currentIndex === -1 || newIndex === currentIndex) return;

    const [movedPage] = menuPages.splice(currentIndex, 1);
    menuPages.splice(newIndex, 0, movedPage);

    if (typeof window.savePagesToFirestore === "function") {
        await window.savePagesToFirestore();
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

    if (typeof window.savePagesToFirestore === "function") {
        await window.savePagesToFirestore();
    }
    renderMenuGrid();
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

        if (typeof window.savePagesToFirestore === "function") {
            await window.savePagesToFirestore();
        }
        if (statusMsg) statusMsg.textContent = "Saved successfully!";
        renderMenuGrid();
    } catch (error) {
        console.error("// Error uploading image:", error);
        if (statusMsg) statusMsg.textContent = "Upload failed.";
    }
};