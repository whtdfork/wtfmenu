// js/components/moments-media-picker.js

import { getFirebaseFilesList } from "./firebase-files.js";

const MEDIA_CONFIGS = [
    {
        name: "Animation",
        formatSelectId: "animationFormatSelect", 
        modeSelectId: "animModeSelect",
        urlGroupId: "animUrlGroup",
        firebaseGroupId: "animFirebaseGroup",
        pickerId: "momentLottiePicker",
        inputId: "momentLottieInput",
        // Allow both Lottie JSON files and image-based animations like GIF, SVG, PNG, WebP
        defaultExtensions: [".json", ".gif", ".svg", ".png", ".webp", ".jpg", ".jpeg"]
    },
    {
        name: "Image",
        modeSelectId: "imageModeSelect",
        urlGroupId: "imageUrlGroup",
        firebaseGroupId: "imageFirebaseGroup",
        pickerId: "momentImagePicker",
        inputId: "momentImageInput",
        defaultExtensions: [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]
    },
    {
        name: "Audio",
        modeSelectId: "audioModeSelect",
        urlGroupId: "audioUrlGroup",
        firebaseGroupId: "audioFirebaseGroup",
        pickerId: "momentAudioPicker",
        inputId: "momentAudioInput",
        defaultExtensions: [".mp3", ".wav", ".aac"]
    },
    {
        name: "Video",
        modeSelectId: "videoModeSelect",
        urlGroupId: "videoModeSelect", // or videoUrlGroup depending on exact ID match
        urlGroupId: "videoUrlGroup",
        firebaseGroupId: "videoFirebaseGroup",
        pickerId: "momentVideoPicker",
        inputId: "momentVideoInput",
        defaultExtensions: [".mp4", ".webm", ".mov"]
    }
];

export async function initMomentsMediaPicker() {
    console.log("// MomentsMediaPicker: Initializing with static HTML layout rules...");

    const firebaseFiles = await getFirebaseFilesList();

    MEDIA_CONFIGS.forEach(config => {
        const modeSelect = document.getElementById(config.modeSelectId);
        const urlGroup = document.getElementById(config.urlGroupId);
        const firebaseGroup = document.getElementById(config.firebaseGroupId);
        const picker = document.getElementById(config.pickerId);
        const input = document.getElementById(config.inputId);
        const formatSelect = config.formatSelectId ? document.getElementById(config.formatSelectId) : null;

        if (!modeSelect || !urlGroup || !firebaseGroup || !picker || !input) {
            console.warn(`// MomentsMediaPicker: Missing one or more static elements for ${config.name}`);
            return;
        }

        // Keep local state for preserving values when switching views
        let currentUrlValue = input.value && !firebaseFiles.some(f => f.url === input.value) ? input.value : "";
        let currentFirebaseValue = firebaseFiles.some(f => f.url === input.value) ? input.value : "";

        // Function to update picker options based on allowed extensions
        const updatePickerOptions = (allowedExtensions) => {
            const previousSelection = picker.value || currentFirebaseValue;
            picker.innerHTML = `<option value="">-- Select from Firebase Media --</option>`;

            firebaseFiles
                .filter(file => {
                    const fileName = file.name.toLowerCase();
                    return allowedExtensions.some(ext => fileName.endsWith(ext));
                })
                .forEach(file => {
                    const opt = document.createElement("option");
                    opt.value = file.url;
                    opt.textContent = file.name;
                    picker.appendChild(opt);
                });

            if (previousSelection) {
                picker.value = previousSelection;
            }
        };

        // Determine active extensions for animation format or default config
        let activeExtensions = config.defaultExtensions;
        if (formatSelect) {
            if (formatSelect.value === "image") {
                activeExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];
            } else {
                activeExtensions = [".json"];
            }
        }

        updatePickerOptions(activeExtensions);

        // Set initial mode based on whether current backing input matches a Firebase file
        const isFirebaseInitial = firebaseFiles.some(f => f.url === input.value);
        if (isFirebaseInitial) {
            modeSelect.value = "firebase";
            picker.value = input.value;
            currentFirebaseValue = input.value;
            urlGroup.style.display = "none";
            firebaseGroup.style.display = "block";
        } else {
            modeSelect.value = "url";
            currentUrlValue = input.value;
            // Find textbox inside urlGroup to set its value if it's an input element
            const textInput = urlGroup.querySelector("input[type='text']") || input;
            if (textInput !== input) textInput.value = currentUrlValue;
            urlGroup.style.display = "block";
            firebaseGroup.style.display = "none";
        }

        // Mode change listener (URL vs Firebase)
        modeSelect.addEventListener("change", () => {
            const isFirebase = modeSelect.value === "firebase";

            urlGroup.style.display = isFirebase ? "none" : "block";
            firebaseGroup.style.display = isFirebase ? "block" : "none";

            if (isFirebase) {
                input.value = picker.value || currentFirebaseValue;
            } else {
                const textInput = urlGroup.querySelector("input[type='text']");
                if (textInput) {
                    textInput.value = currentUrlValue;
                    input.value = currentUrlValue;
                }
            }
            console.log(`// ${config.name} switched to mode: ${modeSelect.value}`);
        });

        // Picker change listener
        picker.addEventListener("change", () => {
            currentFirebaseValue = picker.value;
            input.value = picker.value;
            console.log(`// Selected Firebase file for ${config.name}: ${picker.value}`);
        });

        // Textbox input listener for preservation
        const textInput = urlGroup.querySelector("input[type='text']");
        if (textInput) {
            textInput.addEventListener("input", (e) => {
                currentUrlValue = e.target.value;
                input.value = e.target.value;
            });
        }

        // Format change listener (specifically for animations if present)
        if (formatSelect) {
            formatSelect.addEventListener("change", () => {
                const ext = formatSelect.value === "image" ? [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"] : [".json"];
                updatePickerOptions(ext);
            });
        }
    });

    console.log("// MomentsMediaPicker: Fully initialized using static HTML layout structures.");
}