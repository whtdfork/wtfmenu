import { db } from "./js/firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

async function loadRemoteSiteConfig(defaultConfig) {
  try {
    const docSnap = await getDoc(doc(db, "settings", "site_settings"));
    if (docSnap.exists()) {
      return { ...defaultConfig, ...docSnap.data() };
    }
  } catch (error) {
    console.warn("// Home Page: Unable to fetch dynamic site settings", error);
  }
  return defaultConfig;
}

function renderHome(config) {
  const setText = (selector, value) => document.querySelectorAll(selector).forEach(el => el.textContent = value);
  setText('[data-site="name"]', config.name);
  setText('[data-site="shortDescription"]', config.shortDescription);
  setText('[data-site="heroEyebrow"]', config.heroEyebrow);
  setText('[data-site="heroTitle"]', config.heroTitle);
  setText('[data-site="heroText"]', config.heroText);
  setText('[data-site="aboutText"]', config.aboutText);
  setText('[data-site="address"]', config.address);
  document.title = `${config.name} | ${config.shortDescription}`;
  const announcementEl = document.querySelector('#announcement');
  if (announcementEl) announcementEl.textContent = config.announcement;
  const ratingEl = document.querySelector('#ratingText');
  if (ratingEl) ratingEl.textContent = `★ ${config.rating}`;
  const yearEl = document.querySelector('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  const phoneHref = `tel:${config.phone.replace(/\s/g, '')}`;
  const whatsappHref = `https://wa.me/${config.whatsappNumber}`;
  ['#heroMap', '#directionsLink'].forEach((id) => {
    const anchor = document.querySelector(id);
    if (anchor) anchor.href = config.mapUrl;
  });
  const callLink = document.querySelector('#callLink');
  if (callLink) callLink.href = phoneHref;
  const footerWhatsapp = document.querySelector('#footerWhatsapp');
  if (footerWhatsapp) footerWhatsapp.href = whatsappHref;
  const footerEmail = document.querySelector('#footerEmail');
  if (footerEmail) {
    footerEmail.href = `mailto:${config.email}`;
    footerEmail.textContent = config.email;
  }
  const whatsappFloat = document.querySelector('#whatsappFloat');
  if (whatsappFloat) whatsappFloat.href = whatsappHref;
  const valuesEl = document.querySelector('#values');
  if (valuesEl) valuesEl.innerHTML = config.values.map(([icon, title, text]) => `<article class="value-card"><i>${icon}</i><h3>${title}</h3><p>${text}</p></article>`).join('');
  const favouriteGrid = document.querySelector('#favouriteGrid');
  if (favouriteGrid) favouriteGrid.innerHTML = config.favourites.map(item => `<article class="food-card"><img src="${item.image}" alt="${item.name}"><div class="food-content"><div class="food-meta"><h3>${item.name}</h3><span class="price">${item.price}</span></div><p>${item.description}</p></div></article>`).join('');
  const galleryGrid = document.querySelector('#galleryGrid');
  if (galleryGrid) galleryGrid.innerHTML = config.gallery.map(([image, caption]) => `<figure class="gallery-item"><img src="${image}" alt="${caption}"><span>${caption}</span></figure>`).join('');
  const hoursEl = document.querySelector('#hours');
  if (hoursEl) hoursEl.innerHTML = config.hours.map(([days, times]) => `<div><span>${days}</span><span>${times}</span></div>`).join('');
  const socialIcons = {
    Instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.4" cy="6.6" r="1"></circle></svg>',
    Facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3.1 0-5 1.9-5 5v3H6v4h3v5h4v-5h3l1-4h-4V9c0-.7.3-1 1-1Z"></path></svg>',
    YouTube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.2 7.2a2.7 2.7 0 0 0-1.9-1.9C17.7 5 12 5 12 5s-5.7 0-7.3.3A2.7 2.7 0 0 0 2.8 7.2 28 28 0 0 0 2.5 12c0 1.6.1 3.2.3 4.8a2.7 2.7 0 0 0 1.9 1.9C6.3 19 12 19 12 19s5.7 0 7.3-.3a2.7 2.7 0 0 0 1.9-1.9c.2-1.6.3-3.2.3-4.8 0-1.6-.1-3.2-.3-4.8ZM10 15.5v-7l6 3.5-6 3.5Z"></path></svg>'
  };
  const socialLinks = Object.entries(config.socials || {}).map(([name, url]) => `<a href="${url}" target="_blank" rel="noopener" aria-label="Visit our ${name}">${socialIcons[name] || ''}<span>${name}</span></a>`).join('');
  const socialsEl = document.querySelector('#socials');
  if (socialsEl) socialsEl.innerHTML = socialLinks;
  const homeInstagram = document.querySelector('#homeInstagram');
  if (homeInstagram) {
    homeInstagram.href = config.socials.Instagram;
    homeInstagram.innerHTML = `${socialIcons.Instagram}<span>Instagram</span>`;
  }
  const homeFacebook = document.querySelector('#homeFacebook');
  if (homeFacebook) {
    homeFacebook.href = config.socials.Facebook;
    homeFacebook.innerHTML = `${socialIcons.Facebook}<span>Facebook</span>`;
  }
  const homeYoutube = document.querySelector('#homeYoutube');
  if (homeYoutube) {
    homeYoutube.href = config.socials.YouTube;
    homeYoutube.innerHTML = `${socialIcons.YouTube}<span>YouTube</span>`;
  }
  const homeMap = document.querySelector('#homeMap');
  if (homeMap) homeMap.href = config.mapUrl;
  const nav = document.querySelector('.mobile-nav');
  const scrim = document.querySelector('.nav-scrim');
  const toggle = document.querySelector('.menu-toggle');
  if (nav && scrim && toggle) {
    const close = () => { nav.classList.remove('open'); scrim.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', () => { nav.classList.add('open'); scrim.classList.add('open'); toggle.setAttribute('aria-expanded', 'true'); });
    const closeBtn = document.querySelector('.close-nav');
    if (closeBtn) closeBtn.addEventListener('click', close);
    scrim.addEventListener('click', close);
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
  }
}

(async () => {
  const defaultConfig = window.SITE_CONFIG;
  if (!defaultConfig) return;
  const config = await loadRemoteSiteConfig(defaultConfig);
  renderHome(config);
})();
