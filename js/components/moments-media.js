import { storage } from "../firebase-config.js";
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

export async function loadMomentsMedia() {
    const grid = document.getElementById("momentsMediaGrid");
    if (!grid) return;

    window.showAdminLoader("Loading moments media...");
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
    } finally {
        window.hideAdminLoader();
    }
}

window.deleteMomentsMediaFile = async function(storagePath) {
    if (!confirm("Delete this moments media file?")) return;

    window.showAdminLoader("Deleting media file...");
    try {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
        console.log(`// Firebase Storage: Successfully deleted [${storagePath}]`);
        await loadMomentsMedia();
    } catch (error) {
        console.error("// Error deleting moments file:", error);
        alert("Failed to delete file: " + error.message);
    } finally {
        window.hideAdminLoader();
    }
};

export function initMomentsMediaUpload() {
    const uploadBtn = document.getElementById("uploadMomentsMediaBtn");
    const fileInput = document.getElementById("momentsMediaFileInput");
    const statusDiv = document.getElementById("momentsMediaUploadStatus");

    if (!uploadBtn) return;

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
            window.showAdminLoader("Uploading moments media...");
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
        } finally {
            window.hideAdminLoader();
        }
    });
}