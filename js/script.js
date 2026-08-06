/*
  js/script.js
  Purpose: Generic site utilities and data fetchers.
  Section:
    - Menu JSON loader with graceful failure UI
*/
// Fetch Decoupled JSON Data
async function loadMenuData() {
    renderSkeletons && renderSkeletons();
    try {
            const response = await fetch('data/menu.json');
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        const allMenuItems = await response.json();
        renderMenu && renderMenu(allMenuItems);
    } catch (err) {
            console.error('Failed to load data/menu.json', err);
        const container = document.getElementById('menuContainer');
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--primary-red);">
                    <h3>Failed to load menu data</h3>
                        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 8px;">Please check if <code>data/menu.json</code> exists and is valid JSON.</p>
                </div>
            `;
        }
    }
}
