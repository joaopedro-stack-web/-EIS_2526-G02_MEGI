/* item-page.js — drop-in for your Java.js
   What it does:
   - Reads ?id=<ITEM_ID> and ?c=<COLLECTION_ID> from URL
   - Loads that item from localStorage and populates the form + preview
   - Saves edits (including rating and image) back to localStorage
   - Delete item & Back to Collection buttons
*/

/* ----------------------- Config & utilities ----------------------- */
const APP_BASE = (document.querySelector('meta[name="app-base"]')?.getAttribute('content') || '').replace(/\/+$/, '');
const COLLECTION_PAGE_PATH = (document.querySelector('meta[name="collection-page-path"]')?.getAttribute('content') || 'collection-page.html').replace(/^\/+/, '');

const params = new URLSearchParams(window.location.search);
const ITEM_ID = params.get('id') || '';
const COLLECTION_ID = params.get('c') || 'default-collection';

const KEY_ITEMS = (cid) => `collecta:items:${cid}`;
const KEY_COLLECTIONS = 'collecta:collections';

function readJSON(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const $ = (sel, el=document) => el.querySelector(sel);

// ============================================================================
// >>> NOVO: lógica compartilhada de "Create New Collection" (modal + redirect)
// ============================================================================

const COLLECTIONS_LS_KEY = 'collections-data';

function openCreateCollectionModal() {
  const existing = JSON.parse(localStorage.getItem(COLLECTIONS_LS_KEY) || '[]');

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.45)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 9999,
    padding: '16px'
  });

  const box = document.createElement('div');
  Object.assign(box.style, {
    width: 'min(520px, 100%)',
    background: 'var(--surface, #fff)',
    color: 'var(--text, #111)',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,.25)',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  });

  box.innerHTML = `
    <div style="padding:20px 20px 10px">
      <h2 style="font-size:18px;margin:0 0 6px">Create New Collection</h2>
      <p style="margin:0 0 12px;opacity:.8">Fill the fields below to create a new collection.</p>
    </div>
    <form style="padding:0 20px 16px;display:flex;flex-direction:column;gap:10px">
      <div>
        <label style="display:block;font-weight:600;margin-bottom:4px">Name *</label>
        <input name="name" type="text" required
          style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border,#ddd)">
      </div>

      <div>
        <label style="display:block;font-weight:600;margin-bottom:4px">Type</label>
        <input name="type" type="text" placeholder="Miniatures, Cards..."
          style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border,#ddd)">
      </div>

      <div>
        <label style="display:block;font-weight:600;margin-bottom:4px">Creation date</label>
        <input name="dateCreated" type="date"
          style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border,#ddd)">
      </div>

      <div>
        <label style="display:block;font-weight:600;margin-bottom:4px">Description</label>
        <textarea name="desc" rows="3"
          style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border,#ddd);resize:vertical"></textarea>
      </div>

      <div>
        <label style="display:block;font-weight:600;margin-bottom:4px">Banner image URL</label>
        <input name="img" type="url" placeholder="https://..."
          style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border,#ddd)">
        <small style="display:block;margin-top:4px;opacity:.7">If empty, a random image will be used.</small>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
        <button type="button" data-role="cancel"
          style="border-radius:10px;padding:8px 12px;border:1px solid var(--border,#ddd);background:#f9fafb;cursor:pointer">
          Cancel
        </button>
        <button type="submit"
          style="border-radius:10px;padding:8px 14px;border:1px solid #000;background:#000;color:#fff;font-weight:600;cursor:pointer">
          Create
        </button>
      </div>
    </form>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const formCol = box.querySelector('form');
  const cancelBtnModal = box.querySelector('[data-role="cancel"]');

  function close() {
    overlay.remove();
  }

  cancelBtnModal.addEventListener('click', (e) => {
    e.preventDefault();
    close();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  formCol.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(formCol);

    const name = (data.get('name') || '').toString().trim();
    if (!name) {
      alert('Name is required.');
      return;
    }

    const type = (data.get('type') || '').toString().trim() || 'Miniatures';
    const dateCreated = (data.get('dateCreated') || '').toString() || new Date().toISOString().slice(0, 10);
    const desc = (data.get('desc') || '').toString().trim();
    const imgInput = (data.get('img') || '').toString().trim();
    const fallbackImg = `https://picsum.photos/seed/collection-${Date.now()}/1200/600`;
    const img = imgInput || fallbackImg;

    const newId = Date.now().toString();

    const newCollection = {
      id: newId,
      title: name,
      desc,
      img,
      type,
      dateCreated
    };

    existing.unshift(newCollection);
    localStorage.setItem(COLLECTIONS_LS_KEY, JSON.stringify(existing));

    close();

    // Redireciona para a Collection Page (por enquanto usando ?id= para diferenciar)
    window.location.href = `collection-page.html?id=${encodeURIComponent(newId)}`;
  });
}

function attachCreateCollectionHandler() {
  const btn = document.querySelector('#create-collection, [data-nav="create"]');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openCreateCollectionModal();
  });
}

// garantir que o handler seja ligado depois do DOM pronto
(function () {
  if (document.readyState !== 'loading') attachCreateCollectionHandler();
  else document.addEventListener('DOMContentLoaded', attachCreateCollectionHandler);
})();


// --- Events routing for item page ---
const EVENTS_PAGE_PATH = (
  document.querySelector('meta[name="events-page-path"]')?.getAttribute('content') || 'event.html'
).replace(/^\/+/, '');

function buildEventsUrlFromItem() {
  const base = APP_BASE ? `${APP_BASE}/` : '';
  const cid = COLLECTION_ID || 'default-collection';
  return `${base}${EVENTS_PAGE_PATH}?c=${encodeURIComponent(cid)}`;
}

(function wireEventsButtonForItemPage() {
  const trySet = (el) => {
    if (!el) return false;
    const text = (el.textContent || '').trim().toLowerCase();
    if (
      el.matches('[data-nav="events"]') ||
      el.id === 'eventsBtn' ||
      el.classList.contains('events-btn') ||
      text === 'events'
    ) {
      // Turn into a navigation to the events page for this collection
      if (el.tagName === 'A') el.setAttribute('href', buildEventsUrlFromItem());
      el.addEventListener('click', (e) => {
        if (el.tagName !== 'A') e.preventDefault();
        window.location.href = buildEventsUrlFromItem();
      });
      return true;
    }
    return false;
  };

  let wired = trySet(document.querySelector('[data-nav="events"]'))
           || trySet(document.querySelector('#eventsBtn'))
           || trySet(document.querySelector('.events-btn'));

  if (!wired) {
    document.querySelectorAll('.nav a, .topmenu a, a, button').forEach((el) => { trySet(el); });
  }
})();


/* ----------------------- DOM refs ----------------------- */
const form = $('#itemDataForm');
const photoInput = $('#photoUpload');
const photoPreview = $('#itemPhotoPreview');

const fName = $('#itemName');
const fImportance = $('#importance');
const fWeight = $('#weight');
const fPrice = $('#price');
const fDate = $('#acquisition');
const fDesc = $('#description');
const ratingHidden = $('#ratingValue');   // <input type="hidden" id="ratingValue">

const deleteBtn = $('#deleteItemBtn');

/* ----------------------- Redirect if no id ----------------------- */
if (!ITEM_ID) {
  alert('Missing ?id parameter. Going back to collection.');
  window.location.href = (APP_BASE ? `${APP_BASE}/` : '') + COLLECTION_PAGE_PATH;
}

/* ----------------------- Storage helpers ----------------------- */
function getItems() { return readJSON(KEY_ITEMS(COLLECTION_ID), []); }
function setItems(list) {
  writeJSON(KEY_ITEMS(COLLECTION_ID), list);
  // touch collection metadata
  const all = readJSON(KEY_COLLECTIONS, {});
  const c = all[COLLECTION_ID] || { id: COLLECTION_ID };
  all[COLLECTION_ID] = { ...c, lastRecordAt: new Date().toISOString(), itemCount: list.length };
  writeJSON(KEY_COLLECTIONS, all);
}
function getItemById(id) { return getItems().find(it => it.id === id); }
function upsertItem(item) {
  const list = getItems();
  const i = list.findIndex(it => it.id === item.id);
  if (i >= 0) list[i] = item; else list.unshift(item);
  setItems(list);
}
function deleteItem(id) {
  const list = getItems().filter(it => it.id !== id);
  setItems(list);
}

/* ----------------------- Load or seed shell ----------------------- */
let item = getItemById(ITEM_ID);
if (!item) { item = { id: ITEM_ID, name: '', importance: 5, description: '', image: '', acquiredAt: '', rating: 0 }; upsertItem(item); }

/* ----------------------- Populate form & summary ----------------------- */
function populateFormFromItem(it) {
  if (fName) fName.value = it.name || '';
  if (fImportance) fImportance.value = typeof it.importance === 'number' ? it.importance : 5;
  if (fWeight) fWeight.value = it.weight ?? '';
  if (fPrice) fPrice.value = it.price ?? '';
  if (fDate) fDate.value = it.acquiredAt || '';
  if (fDesc) fDesc.value = it.description || '';
  if (ratingHidden) ratingHidden.value = String(it.rating ?? 0);
  const src = it.image || it.imageUrl;
  if (photoPreview && src) photoPreview.src = src;
}
populateFormFromItem(item);

/* ----------------------- Photo preview on choose ----------------------- */
if (photoInput && photoPreview) {
  photoInput.addEventListener('change', (ev) => {
    const f = ev.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { photoPreview.src = reader.result; };
    reader.readAsDataURL(f);
  });
}

/* ----------------------- Validation ----------------------- */
function asNumber(v) { const n = Number(v); return Number.isFinite(n) ? n : undefined; }
function validate() {
  if (!fName.value.trim()) { alert('Name is required.'); fName.focus(); return false; }
  const imp = Number(fImportance.value);
  if (!Number.isFinite(imp) || imp < 1 || imp > 10) { alert('Importance must be 1–10.'); fImportance.focus(); return false; }
  if (!fDesc.value.trim()) { alert('Description is required.'); fDesc.focus(); return false; }
  return true;
}

/* ----------------------- Submit (save) ----------------------- */
if (form) {
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    async function readNewImageIfAny() {
      const file = photoInput?.files?.[0];
      if (!file) return null;
      const reader = new FileReader();
      return await new Promise((res, rej) => { reader.onload = () => res(reader.result); reader.onerror = () => rej(new Error('Image read error')); reader.readAsDataURL(file); });
    }
    try {
      const newImage = await readNewImageIfAny();
      item = {
        ...item,
        name: fName.value.trim(),
        importance: asNumber(fImportance.value),
        weight: asNumber(fWeight.value),
        price: asNumber(fPrice.value),
        acquiredAt: fDate.value || undefined,
        description: fDesc.value.trim(),
        rating: asNumber(ratingHidden?.value ?? 0),
        ...(newImage ? { image: newImage, imageUrl: undefined } : {})
      };
      upsertItem(item);
      alert('Item saved.');
    } catch (e) {
      console.error(e);
      alert('Could not save image. Try again.');
    }
  });
}

/* ----------------------- Delete ----------------------- */
if (deleteBtn) {
  deleteBtn.addEventListener('click', () => {
    if (!confirm('Delete this item?')) return;
    deleteItem(ITEM_ID);
    alert('Item deleted.');
    window.location.href = (APP_BASE ? `${APP_BASE}/` : '') + COLLECTION_PAGE_PATH;
  });
}

/* ----------------------- Back to Collection (auto-inject) ----------------------- */
(function ensureBackToCollectionButton() {
  const BTN_ID = 'backToCollectionBtn';
  let backBtn = document.getElementById(BTN_ID);
  if (!backBtn) {
    backBtn = document.createElement('button');
    backBtn.id = BTN_ID;
    backBtn.type = 'button';
    backBtn.className = 'btn btn--secondary';
    backBtn.textContent = '← Back to Collection';
    const actionRow = deleteBtn?.parentElement || form || document.body;
    actionRow.appendChild(backBtn);
  }
  backBtn.addEventListener('click', () => {
    window.location.href = (APP_BASE ? `${APP_BASE}/` : '') + COLLECTION_PAGE_PATH;
  });
})();

/* ----------------------- Rating (interactive stars 0–5) ----------------------- */
(() => {
  const stars = document.querySelectorAll('.rating .star');
  const ratingHidden = document.getElementById('ratingValue');
  let currentRating = Number(ratingHidden?.value || 0);

  function paintStars(n) {
    stars.forEach(s => {
      const v = Number(s.dataset.value);
      s.classList.toggle('active', v <= n);
      s.style.color = v <= n ? '#ffcc00' : '#ccc';
    });
  }
  function setRating(n) {
    currentRating = Math.max(0, Math.min(5, Number(n) || 0));
    if (ratingHidden) ratingHidden.value = String(currentRating);
    paintStars(currentRating);
    console.log('Rating set to', currentRating);
  }
  stars.forEach(s => {
    s.addEventListener('click', () => setRating(Number(s.dataset.value)));
    s.addEventListener('mouseenter', () => paintStars(Number(s.dataset.value)));
    s.addEventListener('mouseleave', () => paintStars(currentRating));
  });
  paintStars(currentRating);
})();

/* ==== COLLECTA Safe Hotfix (Item Page) =======================================
   Purpose:
   - Avoid global name collisions (all local)
   - Ensure Back to Collection + Events buttons work
   - Ensure rating stars keep working
============================================================================== */
(() => {
  // -------- Safe helpers --------
  function getMeta(name, fallback) {
    const v = document.querySelector(`meta[name="${name}"]`)?.getAttribute('content');
    return (v ?? fallback ?? '').toString();
  }
  function getAppBase() { return getMeta('app-base', '').replace(/\/+$/, ''); }
  function getCollectionPagePath() { return getMeta('collection-page-path', 'collection-page.html').replace(/^\/+/, ''); }
  function getEventsPagePath() { return getMeta('events-page-path', 'event.html').replace(/^\/+/, ''); }

  const params = new URLSearchParams(window.location.search);
  const COLLECTION_ID = params.get('c') || 'default-collection';

  function goToCollection() {
    const base = getAppBase() ? `${getAppBase()}/` : '';
    window.location.href = base + getCollectionPagePath();
  }
  function goToEvents() {
    const base = getAppBase() ? `${getAppBase()}/` : '';
    window.location.href = `${base}${getEventsPagePath()}?c=${encodeURIComponent(COLLECTION_ID)}`;
  }

  // -------- Back to Collection (auto-inject if missing) --------
  function ensureBackButton() {
    const BTN_ID = 'backToCollectionBtn';
    let backBtn = document.getElementById(BTN_ID);
    if (!backBtn) {
      backBtn = document.createElement('button');
      backBtn.id = BTN_ID;
      backBtn.type = 'button';
      backBtn.className = 'btn btn--secondary';
      backBtn.textContent = '← Back to Collection';
      const actions = document.getElementById('deleteItemBtn')?.parentElement
                   || document.getElementById('itemDataForm')
                   || document.querySelector('main')
                   || document.body;
      actions.appendChild(backBtn);
    }
    backBtn.addEventListener('click', goToCollection);
  }

  // -------- Wire Events button (wherever it is) --------
  function wireEventsButtonItem() {
    const prefer = document.querySelector('[data-nav="events"]')
      || document.getElementById('eventsBtn')
      || document.querySelector('.events-btn');

    if (prefer) {
      if (prefer.tagName === 'A') {
        const base = getAppBase() ? `${getAppBase()}/` : '';
        prefer.setAttribute('href', `${base}${getEventsPagePath()}?c=${encodeURIComponent(COLLECTION_ID)}`);
      }
      prefer.addEventListener('click', (e) => {
        if (prefer.tagName !== 'A') e.preventDefault();
        goToEvents();
      });
      return;
    }

    // Fallback: look for "Events" text
    document.querySelectorAll('a,button').forEach(el => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (t === 'events') {
        if (el.tagName === 'A') {
          const base = getAppBase() ? `${getAppBase()}/` : '';
          el.setAttribute('href', `${base}${getEventsPagePath()}?c=${encodeURIComponent(COLLECTION_ID)}`);
        }
        el.addEventListener('click', (e) => {
          if (el.tagName !== 'A') e.preventDefault();
          goToEvents();
        });
      }
    });
  }

  // -------- Rating stars (keeps working even if earlier code failed) --------
  function ensureRating() {
    const stars = document.querySelectorAll('.rating .star');
    const hidden = document.getElementById('ratingValue');
    if (!hidden) return;

    let current = Number(hidden.value || 0);

    function paint(n) {
      stars.forEach(s => {
        const v = Number(s.dataset.value);
        s.classList.toggle('active', v <= n);
        s.style.color = v <= n ? '#ffcc00' : '#ccc';
      });
    }
    function set(n) {
      current = Math.max(0, Math.min(5, Number(n) || 0));
      hidden.value = String(current);
      paint(current);
      // console.log('[rating] set to', current);
    }

    stars.forEach(s => {
      s.addEventListener('click', () => set(Number(s.dataset.value)));
      s.addEventListener('mouseenter', () => paint(Number(s.dataset.value)));
      s.addEventListener('mouseleave', () => paint(current));
    });

    paint(current);
  }

  // -------- Init on DOM ready --------
  function ready(fn){ document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(() => {
    try { ensureBackButton(); } catch (e) { console.error('[collecta] back button fail', e); }
    try { wireEventsButtonItem(); } catch (e) { console.error('[collecta] events button fail', e); }
    try { ensureRating(); } catch (e) { console.error('[collecta] rating fail', e); }
  });
})();
/* === Universal Nav (Item Page / Index) ======================================
   Purpose:
   - Wire "Events" and "Collections"
   - Auto-inject "← Back to Collection" if absent
   - Keep ?c=<collectionId> from URL
============================================================================= */
(() => {
  // --- Helpers ---
  const getMeta = (n, f='') => (document.querySelector(`meta[name="${n}"]`)?.getAttribute('content') ?? f) + '';
  const APP_BASE = getMeta('app-base').replace(/\/+$/, '');
  const EVENTS_PAGE = getMeta('events-page-path', 'event.html').replace(/^\/+/, '');
  const COLLECTION_PAGE = getMeta('collection-page-path', 'collection-page.html').replace(/^\/+/, '');
  const withBase = (p) => (APP_BASE ? `${APP_BASE}/` : '') + p;

  const params = new URLSearchParams(window.location.search);
  const COLLECTION_ID = params.get('c') || 'default-collection';
  const eventsUrl = withBase(`${EVENTS_PAGE}?c=${encodeURIComponent(COLLECTION_ID)}`);
  const collectionsUrl = withBase(`${COLLECTION_PAGE}?c=${encodeURIComponent(COLLECTION_ID)}`);

  // Wire buttons/links by [data-nav] or visible text
  function wireByTextOrData(selectorText, url) {
    const prefer = document.querySelector(`[data-nav="${selectorText}"]`);
    if (prefer) {
      if (prefer.tagName === 'A') prefer.setAttribute('href', url);
      prefer.addEventListener('click', (e) => { if (prefer.tagName !== 'A') e.preventDefault(); window.location.href = url; });
    }
    document.querySelectorAll('a,button').forEach(el => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (t === selectorText) {
        if (el.tagName === 'A') el.setAttribute('href', url);
        el.addEventListener('click', (e) => { if (el.tagName !== 'A') e.preventDefault(); window.location.href = url; });
      }
    });
  }

  // Ensure a Back-to-Collection button is present
  function ensureBackToCollection() {
    const id = 'backToCollectionBtn';
    if (!document.getElementById(id)) {
      const btn = document.createElement('button');
      btn.id = id;
      btn.type = 'button';
      btn.className = 'btn btn--secondary';
      btn.textContent = '← Back to Collection';
      (document.querySelector('#itemDataForm') || document.querySelector('main') || document.body).prepend(btn);
      btn.addEventListener('click', () => window.location.href = collectionsUrl);
    }
  }

  function ready(fn){ document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(() => {
    wireByTextOrData('events', eventsUrl);
    wireByTextOrData('collections', collectionsUrl);
    ensureBackToCollection();
  });
})();
/* === Universal Profile Wiring (drop-in) =====================================
   Purpose:
   - Make the "Profile" button work on every page (Collection, Item/Index, Events)
   - No global leaks, resilient selectors, and no dependency on other code
============================================================================== */
(() => {
  // Prevent double-binding if this block is included more than once on a page
  if (document.documentElement.dataset.profileWired === '1') return;
  document.documentElement.dataset.profileWired = '1';

  /** Build a lightweight floating menu for the profile button */
  function buildProfileMenu() {
    const wrap = document.createElement('div');
    wrap.className = 'profile-menu';
    Object.assign(wrap.style, {
      position: 'absolute',
      minWidth: '200px',
      background: 'var(--surface, #fff)',
      color: 'inherit',
      borderRadius: '12px',
      boxShadow: '0 16px 40px rgba(0,0,0,.18)',
      padding: '8px',
      zIndex: 10000
    });
    wrap.innerHTML = `
      <ul class="menu__list" role="menu" aria-label="Profile options" style="list-style:none;margin:0;padding:0">
        <li><button class="menu__item" role="menuitem" data-cmd="see-profile"
          style="width:100%;text-align:left;border:0;background:none;padding:10px;border-radius:8px;cursor:pointer">See profile</button></li>
        <li><button class="menu__item" role="menuitem" data-cmd="logout"
          style="width:100%;text-align:left;border:0;background:none;padding:10px;border-radius:8px;cursor:pointer">Logout</button></li>
      </ul>
    `;
    // Small hover effect
    wrap.addEventListener('mouseover', (e) => {
      const it = e.target.closest('.menu__item'); if (!it) return;
      it.style.background = 'rgba(0,0,0,.06)';
    });
    wrap.addEventListener('mouseout', (e) => {
      const it = e.target.closest('.menu__item'); if (!it) return;
      it.style.background = 'transparent';
    });
    return wrap;
  }

  let openMenuEl = null;

  function closeProfileMenu() {
    if (openMenuEl) {
      openMenuEl.remove();
      openMenuEl = null;
    }
    document.removeEventListener('click', onDocClick, true);
    window.removeEventListener('resize', closeProfileMenu);
    window.removeEventListener('scroll', closeProfileMenu, true);
  }

  function onDocClick(e) {
    if (!openMenuEl) return;
    if (!openMenuEl.contains(e.target)) closeProfileMenu();
  }

  function openProfileMenuFor(btn) {
    closeProfileMenu();
    const menu = buildProfileMenu();
    document.body.appendChild(menu);

    // Position below the button
    const r = btn.getBoundingClientRect();
    const gap = 8;
    menu.style.left = Math.round(r.left + window.scrollX) + 'px';
    menu.style.top  = Math.round(r.bottom + window.scrollY + gap) + 'px';

    // Actions
    menu.addEventListener('click', (e) => {
      const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
      if (!cmd) return;
      e.preventDefault();
      if (cmd === 'see-profile') {
        // Hook your real profile route here if you have one:
        // window.location.href = '/profile.html';
        console.log('[profile] open profile');
      } else if (cmd === 'logout') {
        try {
          // Demo: clear app keys if you use localStorage for demo auth
          Object.keys(localStorage).forEach(k => { if (k.startsWith('collecta:')) localStorage.removeItem(k); });
        } catch {}
        console.log('[profile] logout');
        // Reload to reflect state
        setTimeout(() => window.location.reload(), 200);
      }
      closeProfileMenu();
    });

    // Close on outside interactions
    document.addEventListener('click', onDocClick, true);
    window.addEventListener('resize', closeProfileMenu);
    window.addEventListener('scroll', closeProfileMenu, true);

    // Initial focus for a11y
    const first = menu.querySelector('.menu__item');
    if (first) first.focus();

    openMenuEl = menu;
  }

  /** Find the "Profile" trigger robustly */
  function findProfileButton() {
    // Priority: aria-label exact
    let btn = document.querySelector('button[aria-label="Open profile"], [data-nav="profile"]');

    if (!btn) {
      // Fallback: any button/anchor in topbar-like areas whose visible text is "Profile"
      const candidates = Array.from(document.querySelectorAll(
        '.topbar .btn, .topbar__actions .btn, header .btn, a, button'
      ));
      btn = candidates.find(el => /profile/i.test((el.textContent || '').trim()));
    }

    return btn || null;
  }

  function ready(fn){ document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(() => {
    const trigger = findProfileButton();
    if (!trigger) {
      console.warn('[profile] trigger not found on this page');
      return;
    }
    // Make it look/behave like an interactive control for a11y
    if (!trigger.getAttribute('aria-haspopup')) trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openProfileMenuFor(trigger);
      trigger.setAttribute('aria-expanded', 'true');
    });
  });
})();
