// js/components/firebase-files.js

import { storage } from "../firebase-config.js";
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

export async function loadFirebaseFiles() {
    const grid = document.getElementById("firebaseFilesGrid");
    if (!grid) return;
    
    grid.innerHTML = '<p class="muted">Loading files...</p>';
    
    try {
        const listRef = ref(storage, 'moments/');
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
                <button onclick="window.deleteFirebaseFile('moments/${fileName}')" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; width: 100%;">Delete File</button>
            `;
            grid.appendChild(card);
        }
    } catch (error) {
        console.error("// Error loading Firebase files:", error);
        grid.innerHTML = `<p style="color: red;">Error loading files: ${error.message}</p>`;
    }
}

// Helper to fetch list of file objects specifically for dropdown integration elsewhere (e.g., Moments)
export async function getFirebaseFilesList() {
    try {
        const listRef = ref(storage, 'moments/');
        const res = await listAll(listRef);
        const files = [];
        
        for (const itemRef of res.items) {
            const url = await getDownloadURL(itemRef);
            files.push({ name: itemRef.name, url: url });
        }
        return files;
    } catch (error) {
        console.error("// Error fetching Firebase files list for dropdowns:", error);
        return [];
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

export function initFirebaseFileUpload() {
    const uploadGeneralFileBtn = document.getElementById("uploadGeneralFileBtn");
    const fileInput = document.getElementById("generalFileInput");
    const statusDiv = document.getElementById("generalFileUploadStatus");

    if (!uploadGeneralFileBtn) return;

    uploadGeneralFileBtn.addEventListener("click", async () => {
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert("Please select a file to upload first.");
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