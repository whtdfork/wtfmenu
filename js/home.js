/*
  js/home.js
  Purpose: Client-side DOM wiring for the public home page.
  Sections:
    - Content binding (SITE_CONFIG)
    - Social/link wiring
    - Mobile nav interactions
*/
(function() {
  const config = window.SITE_CONFIG;
  if (!config) return;
  const setText = (selector, value) => document.querySelectorAll(selector).forEach(el => el.textContent = value);
  setText('[data-site="name"]', config.name);
  setText('[data-site="shortDescription"]', config.shortDescription);
  setText('[data-site="heroEyebrow"]', config.heroEyebrow);
  setText('[data-site="heroTitle"]', config.heroTitle);
  setText('[data-site="heroText"]', config.heroText);
  setText('[data-site="aboutText"]', config.aboutText);
  setText('[data-site="address"]', config.address);
  document.title = `${config.name} | ${config.shortDescription}`;
  const ann = document.querySelector('#announcement'); if (ann) ann.textContent = config.announcement;
  const ratingEl = document.querySelector('#ratingText'); if (ratingEl) ratingEl.textContent = `★ ${config.rating}`;
  const yearEl = document.querySelector('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();
  const phoneHref = `tel:${config.phone.replace(/\s/g, '')}`;
  const whatsappHref = `https://wa.me/${config.whatsappNumber}`;
  ['#heroMap', '#directionsLink'].forEach(id => { const el = document.querySelector(id); if (el) el.href = config.mapUrl; });
  const callLink = document.querySelector('#callLink'); if (callLink) callLink.href = phoneHref;
  const footerWhatsapp = document.querySelector('#footerWhatsapp'); if (footerWhatsapp) footerWhatsapp.href = whatsappHref;
  const footerEmail = document.querySelector('#footerEmail'); if (footerEmail) { footerEmail.href = `mailto:${config.email}`; footerEmail.textContent = config.email; }
  const whatsappFloat = document.querySelector('#whatsappFloat'); if (whatsappFloat) whatsappFloat.href = whatsappHref;
  const valuesEl = document.querySelector('#values'); if (valuesEl) valuesEl.innerHTML = config.values.map(([icon, title, text]) => `<article class="value-card"><i>${icon}</i><h3>${title}</h3><p>${text}</p></article>`).join('');
  const favEl = document.querySelector('#favouriteGrid'); if (favEl) favEl.innerHTML = (config.favourites || []).map(item => `<article class="food-card"><img src="${item.image}" alt="${item.name}"><div class="food-content"><div class="food-meta"><h3>${item.name}</h3><span class="price">${item.price}</span></div><p>${item.description}</p></div></article>`).join('');
  const galleryEl = document.querySelector('#galleryGrid'); if (galleryEl) galleryEl.innerHTML = (config.gallery || []).map(([image, caption]) => `<figure class="gallery-item"><img src="${image}" alt="${caption}"><span>${caption}</span></figure>`).join('');
  const hoursEl = document.querySelector('#hours'); if (hoursEl) hoursEl.innerHTML = (config.hours || []).map(([days, times]) => `<div><span>${days}</span><span>${times}</span></div>`).join('');
  const socialIcons = {
    Instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.4" cy="6.6" r="1"></circle></svg>',
    Facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3.1 0-5 1.9-5 5v3H6v4h3v5h4v-5h3l1-4h-4V9c0-.7.3-1 1-1Z"></path></svg>',
    YouTube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.2 7.2a2.7 2.7 0 0 0-1.9-1.9C17.7 5 12 5 12 5s-5.7 0-7.3.3A2.7 2.7 0 0 0 2.8 7.2 28 28 0 0 0 2.5 12c0 1.6.1 3.2.3 4.8a2.7 2.7 0 0 0 1.9 1.9C6.3 19 12 19 12 19s5.7 0 7.3-.3a2.7 2.7 0 0 0 1.9-1.9c.2-1.6.3-3.2.3-4.8 0-1.6-.1-3.2-.3-4.8ZM10 15.5v-7l6 3.5-6 3.5Z"></path></svg>'
  };
  const socialLinks = Object.entries(config.socials || {}).map(([name, url]) => `<a href="${url}" target="_blank" rel="noopener" aria-label="Visit our ${name}">${socialIcons[name] || ''}<span>${name}</span></a>`).join('');
  const socialsContainer = document.querySelector('#socials'); if (socialsContainer) socialsContainer.innerHTML = socialLinks;
  ['#homeWhatsapp','#homeInstagram','#homeFacebook','#homeYoutube','#homeMap'].forEach(id => { const el=document.querySelector(id); if (el) el.href = (id==='#homeWhatsapp')? whatsappHref : config.socials[id.replace('#home','')]; });

  // Mobile nav interactions
  const nav = document.querySelector('.mobile-nav'), scrim = document.querySelector('.nav-scrim'), toggle = document.querySelector('.menu-toggle');
  if (toggle && nav && scrim) {
    const close = () => { nav.classList.remove('open'); scrim.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', () => { nav.classList.add('open'); scrim.classList.add('open'); toggle.setAttribute('aria-expanded', 'true'); });
    const closeBtn = document.querySelector('.close-nav'); if (closeBtn) closeBtn.addEventListener('click', close);
    scrim.addEventListener('click', close);
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
  }
})();
