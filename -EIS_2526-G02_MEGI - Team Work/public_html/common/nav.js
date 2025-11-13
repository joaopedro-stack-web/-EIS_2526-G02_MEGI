/*!
 * Collecta Navigation Kit
 * One file to wire topbar/side buttons consistently across all pages.
 * - Works with anchors <a> or <button>
 * - Preserves ?c=<collectionId> across pages
 * - No global collisions; exposes a tiny API: window.CollectaNav.init(options)
 *
 * HOW IT WORKS
 * - Looks for data-nav="collector|collections|events|community|profile|config|create"
 *   (You can also rely on visible text fallback, but data-nav is recommended.)
 * - Reads paths from <meta> tags (item-page-path, events-page-path, collection-page-path)
 * - Collection id source:
 *    • from URL param ?c=... if present
 *    • else from [data-collection-id] on the page
 *    • else "default-collection"
 * - For "profile", "config", "create" it calls optional callbacks you pass in init()
 */

(() => {
  const DOC = document;
  if (window.CollectaNav?.__ready) return; // idempotent

  // ---- utils ---------------------------------------------------------------
  const getMeta = (n, f='') => (DOC.querySelector(`meta[name="${n}"]`)?.getAttribute('content') ?? f) + '';
  const trimSlash = (s='') => s.replace(/^\/+/, '').replace(/\/+$/, '');
const withBase = (p) => {
  const base = trimSlash(getMeta('app-base', ''));
  return base ? `/${base}/${trimSlash(p)}` : trimSlash(p);
};

  const getCollectionId = () => {
    // Priority 1: ?c=...
    const c = new URLSearchParams(location.search).get('c');
    if (c) return c;
    // Priority 2: element with data-collection-id
    const el = DOC.querySelector('[data-collection-id]');
    if (el?.dataset?.collectionId) return el.dataset.collectionId;
    // Fallback
    return 'default-collection';
  };

  // Route map (from meta)
  const ROUTES = {
    item: trimSlash(getMeta('item-page-path', 'index.html')),
    events: trimSlash(getMeta('events-page-path', 'event.html')),
    collections: trimSlash(getMeta('collection-page-path', 'collection-page.html')),
    collector: trimSlash(getMeta('collectors-page-path', 'Homepage.login.html')), // same page by default
    community:   trimSlash(getMeta('community-page-path',  'team_page2.html')),
};

  // Build URLs preserving ?c
  const urlFor = {
    collector: () => withBase(`${ROUTES.collector}?c=${encodeURIComponent(getCollectionId())}`),
    collections: () => withBase(`${ROUTES.collections}?c=${encodeURIComponent(getCollectionId())}`),
    events: () => withBase(`${ROUTES.events}?c=${encodeURIComponent(getCollectionId())}`),
    community: () => withBase(`${ROUTES.community}?c=${encodeURIComponent(getCollectionId())}`),
  };

  // Bind a control to a URL (works for <a> or <button>)
  function wireToUrl(el, href) {
    if (el.tagName === 'A') el.setAttribute('href', href);
    el.addEventListener('click', (e) => {
      if (el.tagName !== 'A') e.preventDefault();
      // open in new tab if Ctrl/Meta-click
      if (e.metaKey || e.ctrlKey || (el.getAttribute('target') === '_blank')) {
        window.open(href, '_blank');
      } else {
        window.location.href = href;
      }
    });
  }

  // Find elements by data-nav="xxx" or visible text fallback
  function findTargets(key) {
    const prefer = Array.from(DOC.querySelectorAll(`[data-nav="${key}"]`));
    if (prefer.length) return prefer;
    // fallback by visible text
    const txt = key.toLowerCase();
    return Array.from(DOC.querySelectorAll('a,button')).filter(el => (el.textContent || '').trim().toLowerCase() === txt);
  }

  // Default pop actions (you can override via init options)
  function defaultProfile() {
    alert('Profile: plug your profile route or menu here.\nTip: pass onProfile() in CollectaNav.init(...) to customize.');
  }
  function defaultConfig() {
    alert('Config: open your settings modal/page here.\nTip: pass onConfig() in CollectaNav.init(...) to customize.');
  }
  function defaultCreate() {
    alert('Create New Collection: open your creation flow here.\nTip: pass onCreate() in CollectaNav.init(...) to customize.');
  }

  // Ensure a “← Back to Collection” exists (optional helper for Item/Events pages)
  function ensureBackToCollection() {
    const id = 'backToCollectionBtn';
    if (DOC.getElementById(id)) return;
    const btn = DOC.createElement('button');
    btn.id = id;
    btn.type = 'button';
    btn.className = 'btn btn--secondary';
    btn.textContent = '← Back to Collection';
    (DOC.querySelector('main') || DOC.body).prepend(btn);
    wireToUrl(btn, urlFor.collections());
  }

  // ---- Public API ----------------------------------------------------------
  function init(options = {}) {
    const {
      onProfile = defaultProfile,
      onConfig = defaultConfig,
      onCreate = defaultCreate,
      autoBackButton = false,   // set true on pages where you want the injected back button
    } = options;

    // Navigation buttons (pages)
    findTargets('collector').forEach(el => wireToUrl(el, urlFor.collector()));
    findTargets('collections').forEach(el => wireToUrl(el, urlFor.collections()));
    findTargets('events').forEach(el => wireToUrl(el, urlFor.events()));
    findTargets('community').forEach(el => wireToUrl(el, urlFor.community()));

    // Action buttons (callbacks)
    findTargets('profile').forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); onProfile(el); });
      // A11y niceties
      el.setAttribute('aria-haspopup', 'menu');
      el.setAttribute('aria-expanded', 'false');
    });
    findTargets('config').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); onConfig(el); }));
    findTargets('create').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); onCreate(el); }));

    if (autoBackButton) ensureBackToCollection();
  }

  // export
  window.CollectaNav = { init, __ready: true };
})();
/* 
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/ClientSide/javascript.js to edit this template
 */


