export function setupImageModal() {
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