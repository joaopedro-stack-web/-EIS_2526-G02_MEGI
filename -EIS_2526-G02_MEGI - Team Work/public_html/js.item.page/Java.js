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
