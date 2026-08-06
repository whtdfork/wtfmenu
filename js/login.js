// js/login.js

// 1. Import the 'auth' instance you initialized in firebase-config.js
import { auth } from "./firebase-config.js";

// 2. Import Firebase Authentication methods from the Web SDK
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// DOM Elements
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const errorMessage = document.getElementById("errorMessage");

// Log for debugging
console.log("Login script loaded. Auth instance initialized:", auth);

// 3. Auto-redirect if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Log user info when authenticated
        console.log("User already logged in:", user.email);
        window.location.href = "../admin/index.html";
    }
});

// 4. Handle Login Form Submission
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Reset error UI
    errorMessage.style.display = "none";
    errorMessage.textContent = "";
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {
        // Authenticate with Firebase using email & password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Login successful for user:", userCredential.user.email);
        
        // Successful login will trigger onAuthStateChanged above and redirect to admin panel
    } catch (error) {
        console.error("Login Error:", error.code, error.message);
        
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
        errorMessage.style.display = "block";
        
        switch (error.code) {
            case "auth/invalid-credential":
            case "auth/wrong-password":
            case "auth/user-not-found":
                errorMessage.textContent = "Invalid email or password.";
                break;
            case "auth/too-many-requests":
                errorMessage.textContent = "Too many failed attempts. Try again later.";
                break;
            default:
                errorMessage.textContent = "Failed to log in: " + error.message;
                break;
        }
    }
});