// js/components/auth.js

import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "../firebase-config.js";

export function initAuth() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;

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
}