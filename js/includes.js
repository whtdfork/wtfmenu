// js/includes.js
// Client-side partial injector for header and footer.
// Usage: include this script with `defer` on pages that need the shared header/footer.

(async function() {
  async function loadPartial(path) {
    try {
      const res = await fetch(path, {cache: 'no-cache'});
      if (!res.ok) throw new Error('Failed to fetch ' + path + ' (' + res.status + ')');
      return await res.text();
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  const headerEl = document.getElementById('site-header');
  const footerEl = document.getElementById('site-footer');

  const headerHtml = headerEl ? await loadPartial('header.html') : null;
  const footerHtml = footerEl ? await loadPartial('footer.html') : null;

  if (headerEl && headerHtml) headerEl.innerHTML = headerHtml;
  if (footerEl && footerHtml) footerEl.innerHTML = footerHtml;

  const config = window.SITE_CONFIG || {};
  const page = window.location.pathname.split('/').pop().toLowerCase();

  if (config && page === 'index.html') {
    const topBar = document.querySelector('.top-bar');
    if (topBar) {
      topBar.classList.add('index-page');
      const headerBlock = document.createElement('header');
      headerBlock.className = 'header';
      headerBlock.innerHTML = `<div class="header-content"><p class="hero-tagline">${config.heroTitle}</p><p class="hero-description">${config.heroSubtitle || config.heroText}</p></div>`;
      topBar.insertAdjacentElement('afterend', headerBlock);
    }
  }

  // Page-specific top-right CTA.
  const topCta = document.querySelector('.visit-btn');
  if (topCta) {
    if (page === 'home.html') {
      topCta.innerHTML = 'Digital menu <span>↗</span>';
      topCta.href = 'index.html';
    } else {
      topCta.innerHTML = 'Explore us <span>→</span>';
      topCta.href = 'home.html';
    }

    const desktopNav = document.querySelector('.desktop-nav');
    if (page === 'index.html' && desktopNav) {
      desktopNav.style.display = 'none';
    }
  }
  if (config) {
    const footerWhatsapp = document.querySelector('#footerWhatsapp');
    const footerEmail = document.querySelector('#footerEmail');
    const whatsappFloat = document.querySelector('#whatsappFloat');
    const socialsContainer = document.querySelector('#socials');
    if (footerWhatsapp && config.whatsappNumber) {
      footerWhatsapp.href = `https://wa.me/${config.whatsappNumber}`;
    }
    if (footerEmail && config.email) {
      footerEmail.href = `mailto:${config.email}`;
      footerEmail.textContent = config.email;
    }
    if (whatsappFloat && config.whatsappNumber) {
      whatsappFloat.href = `https://wa.me/${config.whatsappNumber}`;
    }
    if (socialsContainer && config.socials) {
      const socialIcons = {
        Instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.4" cy="6.6" r="1"></circle></svg>',
        Facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3.1 0-5 1.9-5 5v3H6v4h3v5h4v-5h3l1-4h-4V9c0-.7.3-1 1-1Z"></path></svg>',
        YouTube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.2 7.2a2.7 2.7 0 0 0-1.9-1.9C17.7 5 12 5 12 5s-5.7 0-7.3.3A2.7 2.7 0 0 0 2.8 7.2 28 28 0 0 0 2.5 12c0 1.6.1 3.2.3 4.8a2.7 2.7 0 0 0 1.9 1.9C6.3 19 12 19 12 19s5.7 0 7.3-.3a2.7 2.7 0 0 0 1.9-1.9c.2-1.6.3-3.2.3-4.8 0-1.6-.1-3.2-.3-4.8ZM10 15.5v-7l6 3.5-6 3.5Z"></path></svg>'
      };
      socialsContainer.innerHTML = Object.entries(config.socials).map(([name, url]) => `<a href="${url}" target="_blank" rel="noopener" aria-label="Visit our ${name}">${socialIcons[name] || ''}<span>${name}</span></a>`).join('');
    }
  }

  // Basic header behavior: wire drawer toggle buttons (if present)
  try {
    const openBtn = document.querySelector('.menu-icon-btn');
    const drawer = document.getElementById('dropdownDrawer');
    const closeBtn = document.querySelector('.drawer-close');
    if (openBtn && drawer) {
      openBtn.addEventListener('click', () => drawer.classList.add('active'));
    }
    if (closeBtn && drawer) {
      closeBtn.addEventListener('click', () => drawer.classList.remove('active'));
    }
    // Close drawer when clicking outside (basic)
    document.addEventListener('click', (e) => {
      if (!drawer) return;
      if (drawer.classList.contains('active') && !drawer.contains(e.target) && !e.target.closest('.menu-icon-btn')) {
        drawer.classList.remove('active');
      }
    });
  } catch (e) {
    console.warn('Header init failed', e);
  }

  // Dispatch event so other scripts can initialize after partials are available
  window.dispatchEvent(new CustomEvent('partialsLoaded'));
})();
