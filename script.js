// Fetch Decoupled JSON Data
        async function loadMenuData() {
            renderSkeletons();
            try {
                const response = await fetch('menu.json');
                if (!response.ok) throw new Error('HTTP error ' + response.status);
                allMenuItems = await response.json();
                renderMenu(allMenuItems);
            } catch (err) {
                // Comment: Handle fetch failure gracefully by logging and showing UI feedback
                console.error("Failed to load menu.json", err); // Log error for debugging
                const container = document.getElementById('menuContainer'); // Get container element
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--primary-red);">
                        <h3>Failed to load menu data</h3>
                        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 8px;">
                            Please check if <code>menu.json</code> exists in the root folder and is valid JSON.
                        </p>
                    </div>
                `; // Render error state UI
            }
        }