
/**
 * collection-page.js (updated for provided HTML)
 * - Works with the exact markup/ARIA from the user's snippet.
 * - View/edit collection, list/search/filter/paginate items
 * - Create/delete items
 * - Navigate to item page on card/title click
 * - Upgrades existing static cards (adds delete button + proper href)
 */
(() => {
  "use strict";
  // NetBeans/Java Web friendly base path (optional).
  // Set <meta name="app-base" content="/YourApp/"> in JSP/HTML if your app runs under a context path.
  const APP_BASE = (document.querySelector('meta[name="app-base"]')?.getAttribute('content') || '').replace(/\/+$/, '') + '';
// Where the item page lives (read from <meta> or fallback to index.html)
const ITEM_PAGE_PATH = (
  document.querySelector('meta[name="item-page-path"]')?.getAttribute('content') || 'index.html'
).replace(/^\/+/, '');

// Build canonical item URL like: index.html?id=ITEM_ID&c=COLLECTION_ID
const buildItemUrl = (itemId) => {
  const base = APP_BASE ? `${APP_BASE}/` : '';
  const c = collectionId || 'demo-collection';
  return `${base}${ITEM_PAGE_PATH}?id=${encodeURIComponent(itemId)}&c=${encodeURIComponent(c)}`;
};

  /** ----------------------------- Utilities ----------------------------- */
  // Safe UUID even if crypto is unavailable (NetBeans preview, http:)
function safeUUID() {
  try {
  } catch {
    // Fallback pseudo-UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
      const r = Math.random() * 16 | 0, v = ch === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// escapeHTML to avoid XSS and fix ReferenceError
function escapeHTML(value) {
  const s = String(value ?? "");
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return s.replace(/[&<>"']/g, ch => map[ch]);
}

  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));
  const on = (el, evt, selOrHandler, handler) => {
    if (typeof selOrHandler === "function") {
      el.addEventListener(evt, selOrHandler);
    } else {
      el.addEventListener(evt, (e) => {
        const target = e.target.closest(selOrHandler);
        if (target && el.contains(target)) handler(e, target);
      });
    }
  };
  const debounce = (fn, wait = 250) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, args), wait); };
  };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const isoNow = () => new Date().toISOString();
  const uuid = () => safeUUID();

    ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
    /* =========================
   Form helpers (textarea & image with preview)
   ========================= */
function buildTextAreaField({ label, name, required = false, rows = 4 }) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const id = `f_${name}_${Math.random().toString(36).slice(2,7)}`;
  wrap.innerHTML = `
    <label for="${id}" class="sr-only">${label}</label>
    <textarea id="${id}" name="${name}" rows="${rows}" ${required ? "required" : ""}></textarea>
  `;
  const input = wrap.querySelector("textarea");
  return { wrap, input };
}

function buildImageField({ label = "Image", name = "imageFile" } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const id = `f_${name}_${Math.random().toString(36).slice(2,7)}`;
  wrap.innerHTML = `
    <label for="${id}" class="sr-only">${label}</label>
    <input id="${id}" name="${name}" type="file" accept="image/*">
    <div class="form-preview" aria-hidden="true" hidden>
      <img class="form-preview__img" alt="Image preview">
    </div>
  `;
  const input = wrap.querySelector("input[type=file]");
  const previewWrap = wrap.querySelector(".form-preview");
  const previewImg = wrap.querySelector(".form-preview__img");

  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) { previewWrap.hidden = true; previewImg.src = ""; return; }
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewWrap.hidden = false;
  });

  return {
    wrap, input,
    async toDataURL() {
      const file = input.files && input.files[0];
      if (!file) return null;
      const reader = new FileReader();
      return await new Promise(res => {
        reader.onload = () => res(reader.result);
        reader.readAsDataURL(file);
      });
    }
  };
}

/** ----------------------------- Profile Menu ----------------------------- */
function buildProfileMenu() {
  const wrap = document.createElement("div");
  wrap.className = "menu";
  wrap.innerHTML = `
    <ul class="menu__list" role="menu" aria-label="Profile options">
      <li><button class="menu__item" role="menuitem" data-cmd="see-profile">See profile</button></li>
      <li><button class="menu__item" role="menuitem" data-cmd="logout">Logout</button></li>
    </ul>
  `;
  return wrap;
}

let openMenuEl = null;
function closeProfileMenu() {
  if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; }
  document.removeEventListener("click", onDocClickForMenu, true);
  window.removeEventListener("resize", closeProfileMenu);
  window.removeEventListener("scroll", closeProfileMenu, true);
}

function onDocClickForMenu(e) {
  if (!openMenuEl) return;
  if (!openMenuEl.contains(e.target)) closeProfileMenu();
}

function openProfileMenuFor(btn) {
  closeProfileMenu();
  const menu = buildProfileMenu();
  document.body.appendChild(menu);

  // Position above Button (use viewport coordinates)
  const r = btn.getBoundingClientRect();
  const gap = 8;
  menu.style.left = Math.round(r.left + window.scrollX) + "px";
  menu.style.top  = Math.round(r.bottom + window.scrollY + gap) + "px";

  // Actions
  menu.addEventListener("click", (e) => {
    const cmd = e.target.closest("[data-cmd]")?.dataset.cmd;
    if (!cmd) return;
    e.preventDefault();
    if (cmd === "see-profile") {
      // Navigation: ajuste se tiver rota real
      // window.location.href = "profile.html";
      showToast("Opening profile…", "info");
    } else if (cmd === "logout") {
      // Clean local data (demo/localStorage) and reboot
      Object.keys(localStorage).forEach(k => { if (k.startsWith("collecta:")) localStorage.removeItem(k); });
      showToast("Logged out.", "success");
      setTimeout(() => window.location.reload(), 400);
    }
    closeProfileMenu();
  });

  // Closing Global Interaction
  document.addEventListener("click", onDocClickForMenu, true);
  window.addEventListener("resize", closeProfileMenu);
  window.addEventListener("scroll", closeProfileMenu, true);

  // Initial Focus
  const first = menu.querySelector(".menu__item");
  if (first) first.focus();

  openMenuEl = menu;
}

  /** ----------------------------- Toasts ----------------------------- */
  let toastRoot;
  function ensureToastRoot() {
    if (!toastRoot) {
      toastRoot = document.createElement("div");
      toastRoot.className = "toast-root";
      toastRoot.setAttribute("aria-live", "polite");
      toastRoot.setAttribute("role", "status");
      Object.assign(toastRoot.style, {
        position: "fixed", right: "16px", bottom: "16px",
        zIndex: 9999, display: "flex", flexDirection: "column", gap: "8px"
      });
      document.body.appendChild(toastRoot);
    }
  }
  function showToast(message, type = "info", timeout = 3000) {
    ensureToastRoot();
    const el = document.createElement("div");
    el.textContent = message;
    el.className = `toast toast--${type}`;
    Object.assign(el.style, {
      background: type === "error" ? "#B00020" : type === "success" ? "#0B8A83" : "#333",
      color: "white", padding: "10px 14px", borderRadius: "10px",
      boxShadow: "0 8px 24px rgba(0,0,0,.2)", fontSize: "14px", maxWidth: "320px"
    });
    toastRoot.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0"; el.style.transform = "translateY(8px)"; el.style.transition = "all .25s ease";
      setTimeout(() => el.remove(), 250);
    }, timeout);
  }

  /** ----------------------------- Focus Trap ----------------------------- */
  function trapFocus(modalEl) {
    const FOCUSABLE = [
      "a[href]","area[href]","input:not([disabled])","select:not([disabled])",
      "textarea:not([disabled])","button:not([disabled])","iframe","object",
      "embed","[tabindex]:not([tabindex='-1'])","[contenteditable]"
    ].join(",");
    const focusables = () => qsa(FOCUSABLE, modalEl).filter(el => el.offsetParent !== null);
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); closeModal(modalEl); }
      else if (e.key === "Tab") {
        const list = focusables(); if (!list.length) return;
        const first = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    }
    modalEl.__trapHandler = onKey; modalEl.addEventListener("keydown", onKey);
  }
  function untrapFocus(modalEl) {
    if (modalEl.__trapHandler) modalEl.removeEventListener("keydown", modalEl.__trapHandler);
  }

  /** ----------------------------- Modals ----------------------------- */
  let lastFocus;
  function openModal(content, { labelledBy = "dialog-title" } = {}) {
    lastFocus = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", labelledBy);
    Object.assign(overlay.style, {
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
      display: "grid", placeItems: "center", zIndex: 9998, padding: "16px"
    });
    const box = document.createElement("div");
    box.className = "modal-box";
    Object.assign(box.style, {
      width: "min(560px, 100%)", background: "var(--surface, #fff)",
      color: "inherit", borderRadius: "16px", boxShadow: "0 20px 60px rgba(0,0,0,.25)", overflow: "hidden"
    });
    box.appendChild(content); overlay.appendChild(box); document.body.appendChild(overlay);
    trapFocus(overlay);
    const firstInput = qsa("input, select, textarea, button", overlay).find(el => !el.disabled);
    (firstInput || overlay).focus();
    on(overlay, "click", (e) => { if (e.target === overlay) closeModal(overlay); });
    return overlay;
  }
  function closeModal(overlay) {
    if (!overlay) return;
    untrapFocus(overlay); overlay.remove();
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }
  function confirmDialog({ title, message, confirmText = "Confirm", cancelText = "Cancel" }) {
    return new Promise((resolve) => {
      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <div style="padding:20px 20px 0">
          <h2 id="dialog-title" style="font-size:18px;margin:0 0 8px">${title}</h2>
          <p style="margin:0 0 16px;opacity:.85">${message}</p>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding:16px 20px 20px">
          <button class="btn btn--ghost" data-cmd="cancel">${cancelText}</button>
          <button class="btn" data-cmd="confirm">${confirmText}</button>
        </div>
      `;
      const overlay = openModal(wrap, { labelledBy: "dialog-title" });
      const onClick = (e) => {
        const cmd = e.target.closest("[data-cmd]")?.dataset.cmd;
        if (!cmd) return;
        e.preventDefault(); closeModal(overlay); resolve(cmd === "confirm");
      };
      on(wrap, "click", onClick);
    });
  }

  /** ----------------------------- State ----------------------------- */
  const main = qs("#main-content");
  if (!main) { console.warn("[collection-page.js] #main-content not found"); return; }
  const collectionId = main.dataset.collectionId || "demo-collection";

  const state = {
    page: 1, pageSize: 9, hasMore: true,
    search: "", filters: {}, collection: null, items: [],
  };

  /** ----------------------------- API Layer ----------------------------- */
  const USE_REST = false;
  const api = USE_REST ? restApi() : localApi();

  function restApi() {
    const BASE = `${APP_BASE}${APP_BASE?"/":""}api`;
    const j = (r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); };
    return {
      async getCollection(id) { return fetch(`${BASE}/collections/${id}`).then(j); },
      async updateCollection(id, patch) {
        return fetch(`${BASE}/collections/${id}`, { method: "PATCH", headers: { "Content-Type":"application/json" }, body: JSON.stringify(patch) }).then(j);
      },
      async listItems(id, { page, pageSize, search, filters }) {
        const params = new URLSearchParams({ page, pageSize });
        if (search) params.set("q", search);
        if (filters && Object.keys(filters).length) params.set("filter", JSON.stringify(filters));
        return fetch(`${BASE}/collections/${id}/items?` + params.toString()).then(j);
      },
      async createItem(id, payload) {
        return fetch(`${BASE}/collections/${id}/items`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) }).then(j);
      },
      async deleteItem(id, itemId) {
        return fetch(`${BASE}/collections/${id}/items/${itemId}`, { method:"DELETE" }).then(j);
      },
    };
  }

  function localApi() {
    const KEY_COLLECTIONS = "collecta:collections";
    const KEY_ITEMS = (id) => `collecta:items:${id}`;

    function readJSON(key, fallback) {
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
      catch { return fallback; }
    }
    function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

    return {
      async getCollection(id) {
        const all = readJSON(KEY_COLLECTIONS, {});
        return all[id] || null;
      },
      async updateCollection(id, patch) {
        const all = readJSON(KEY_COLLECTIONS, {});
        const current = all[id] || { id };
        const next = { ...current, ...patch, lastRecordAt: isoNow() };
        all[id] = next; writeJSON(KEY_COLLECTIONS, all); return next;
      },
      async listItems(id, { page = 1, pageSize = 9, search = "", filters = {} }) {
        let items = readJSON(KEY_ITEMS(id), []);
        if (search) {
          const s = search.toLowerCase();
          items = items.filter(it =>
            (it.name || "").toLowerCase().includes(s) ||
            (it.type || "").toLowerCase().includes(s) ||
            String(it.year || "").includes(s)
          );
        }
        if (filters.type) items = items.filter(it => (it.type || "").toLowerCase() === String(filters.type).toLowerCase());
        if (filters.rarity === "high") items = items.filter(it => Number(it.rarity || 0) >= 8);
        if (filters.recent === true) items = items.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = items.length;
        const start = (page - 1) * pageSize;
        const paged = items.slice(start, start + pageSize);
        return { items: paged, page, pageSize, total, hasMore: start + pageSize < total };
      },
      async createItem(id, payload) {
        const key = KEY_ITEMS(id);
        const items = readJSON(key, []);
        const item = { id: uuid(), createdAt: isoNow(), ...payload };
        items.unshift(item); writeJSON(key, items);
        const all = readJSON(KEY_COLLECTIONS, {});
        const c = all[id] || { id };
        all[id] = { ...c, itemCount: (c.itemCount || 0) + 1, lastRecordAt: isoNow() };
        writeJSON(KEY_COLLECTIONS, all);
        return item;
      },
      async deleteItem(id, itemId) {
        const key = KEY_ITEMS(id);
        const items = readJSON(key, []);
        const next = items.filter(it => it.id !== itemId);
        writeJSON(key, next);
        const all = readJSON(KEY_COLLECTIONS, {});
        const c = all[id] || { id };
        all[id] = { ...c, itemCount: clamp((c.itemCount || 1) - 1, 0, 999999), lastRecordAt: isoNow() };
        writeJSON(KEY_COLLECTIONS, all);
        return { ok: true };
      },
    };
  }

  /** ----------------------------- Rendering ----------------------------- */
  const grid = qs("section.grid[aria-label='Collection items grid'], section.grid", main) || qs(".grid", main);
  const viewMoreBtn = qs('.loadmore .btn[aria-label="View more items"], .loadmore .btn', main);
  const heroTitle = qs(".hero .hero__title", main);
  const heroSubtitle = qs(".hero .hero__subtitle", main);
  const heroImg = qs(".hero .hero__media img", main);
  const statsAside = qs("aside.stats");
  const searchInput = qs("#search-input", main);
  const filterSelect = qs("#filter-select", main);
  // NOTE: Add button label per provided HTML
  const btnAddItem = qs('button[aria-label="Add a new item to this collection"]', main);
  const btnManage = qs('button[aria-label="Manage this collection"]', main);

  function text(el, value) { if (el) el.textContent = value ?? ""; }

  function renderCollectionHeader(collection) {
    if (heroTitle) text(heroTitle, collection.title || "Untitled Collection");
    if (heroSubtitle) text(heroSubtitle, collection.subtitle || "");
    if (heroImg && collection.coverImageUrl) {
      heroImg.src = collection.coverImageUrl;
      heroImg.alt = collection.title ? `${collection.title} cover image` : "Collection cover image";
    }
  }

  function renderStats(collection, itemsCount) {
    if (!statsAside) return;
    // Map DT -> DD and set values
    const rows = qsa(".stats__row", statsAside);
    const getDD = (label) => {
      const row = rows.find(r => (qs("dt", r)?.textContent || "").trim().toLowerCase() === label.toLowerCase());
      return row ? qs("dd", row) : null;
    };
    const ddCreated = getDD("Created");
    const ddType = getDD("Type");
    const ddCount = getDD("Number of Items");
    const ddLast = getDD("Last Record");
    if (ddCreated) ddCreated.textContent = collection.createdAt ? new Date(collection.createdAt).toLocaleDateString() : "—";
    if (ddType) ddType.textContent = collection.type || "—";
    if (ddCount) ddCount.textContent = String(itemsCount ?? collection.itemCount ?? state.items.length ?? 0);
    if (ddLast) ddLast.textContent = collection.lastRecordAt ? new Date(collection.lastRecordAt).toLocaleString() : "—";
  }

  function metaText(it) {
  const parts = [];
  if (typeof it.importance === "number") parts.push(`Importance ${clamp(it.importance,1,10)}`);
  if (it.acquiredAt) {
    try { parts.push(new Date(it.acquiredAt).toLocaleDateString()); } catch { parts.push(String(it.acquiredAt)); }
  }
  if (typeof it.price === "number") parts.push(`Price ${it.price}`);
  return parts.join(" · ");
}

function cardImageSrc(it) {
  return it.image || it.imageUrl || it.src || "https://picsum.photos/seed/placeholder/400/300";
}

function cardDescriptionText(it) {
  return it.description || "";
}

  function cardTemplate(it) {
  const hasImportance = typeof it.importance === "number" && !Number.isNaN(it.importance);
  const badge = hasImportance
    ? `<span class="badge" title="Importance ${clamp(it.importance,1,10)}">I${clamp(it.importance,1,10)}</span>`
    : "";

  const href = buildItemUrl(it.id);

  return `
    <article aria-label="${escapeHTML(it.name || "Item")}" class="card" data-item-id="${escapeHTML(it.id || "")}" tabindex="0">
      <div class="card__media" data-href="${escapeHTML(href)}">
        <img alt="${escapeHTML(it.name || "Item image")}" src="${escapeHTML(cardImageSrc(it))}"/>
        ${badge}
        <button class="card__action card__action--delete" title="Delete item ${escapeHTML(it.name || "")}" aria-label="Delete item ${escapeHTML(it.name || "")}">×</button>
      </div>
      <div class="card__body">
        <h3 class="card__title">
          <a aria-label="Open ${escapeHTML(it.name || "Item")} details" href="${escapeHTML(href)}">
            ${escapeHTML(it.name || "Item")}
          </a>
        </h3>
        <p class="card__meta">${escapeHTML(metaText(it))}</p>
        ${cardDescriptionText(it) ? `<p class="card__desc">${escapeHTML(cardDescriptionText(it))}</p>` : ``}
      </div>
    </article>
  `;
}


  function renderItems(items, { append = false } = {}) {
    if (!grid) return;
    const html = items.map(cardTemplate).join("");
    if (append) {
      const frag = document.createElement("div"); frag.innerHTML = html;
      grid.append(...frag.children);
    } else {
      grid.innerHTML = html;
    }
  }

  function setViewMoreState(hasMore) {
    state.hasMore = !!hasMore;
    if (viewMoreBtn) {
      viewMoreBtn.disabled = !state.hasMore;
      viewMoreBtn.style.display = state.hasMore ? "" : "none";
    }
  }

  /** ----------------------------- Forms ----------------------------- */
  function buildFormField({ label, name, type = "text", required = false, attrs = {} }) {
    const id = `f_${name}_${Math.random().toString(36).slice(2,7)}`;
    const wrap = document.createElement("div");
    wrap.style.margin = "8px 0 12px";
    wrap.innerHTML = `
      <label for="${id}" style="display:block;font-weight:600;margin-bottom:6px">${label}${required ? " *" : ""}</label>
      ${type === "select" ? `
        <select id="${id}" name="${name}" ${required ? "required" : ""} style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px">
          <option value="Figure">Figure</option>
          <option value="Other">Other</option>
        </select>
      ` : `
        <input id="${id}" name="${name}" type="${type}" ${required ? "required" : ""} style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px">
      `}
      <div class="field-error" aria-live="polite" style="color:#B00020;font-size:12px;margin-top:6px;height:0;overflow:hidden"></div>
    `;
    const input = qs("input, select", wrap);
    Object.entries(attrs || {}).forEach(([k,v]) => input.setAttribute(k, v));
    return { wrap, input, errorEl: qs(".field-error", wrap) };
  }
  function showError(field, msg) {
    field.errorEl.textContent = msg || "";
    field.errorEl.style.height = msg ? "auto" : "0";
  }

function modalCreateItem() {
  const form = document.createElement("form");
  form.setAttribute("novalidate", "true");
  form.innerHTML = `
    <div style="padding:20px 20px 0">
      <h2 id="dialog-title" style="font-size:18px;margin:0 0 8px">Add Item</h2>
      <p style="margin:0 0 10px;opacity:.85">Fill the details and hit Create.</p>
    </div>
  `;

  // Basic fields
  const fields = {
    name:        buildFormField({ label: "Name", name: "name", required: true }),
    importance:  buildFormField({ label: "Importance (1–10)", name: "importance", type: "number", required: true, attrs: { min: "1", max: "10", step: "1", inputmode: "numeric" } }),
    weight:      buildFormField({ label: "Weight", name: "weight", type: "number", attrs: { step: "any", inputmode: "decimal" } }),
    price:       buildFormField({ label: "Price", name: "price", type: "number", attrs: { step: "0.01", min: "0", inputmode: "decimal" } }),
    acquiredAt:  buildFormField({ label: "Date of acquisition", name: "acquiredAt", type: "date" }),
    imageUrl:    buildFormField({ label: "Image URL (optional)", name: "imageUrl", type: "url" }),
    description: buildTextAreaField({ label: "Description (optional)", name: "description", rows: 4 })
  };

  // File image (with preview)
  const imageFileField = buildImageField({ label: "Image file (optional)", name: "imageFile" });

  // Live preview when URL is typed
  const urlPreview = document.createElement("div");
  urlPreview.className = "form-preview";
  urlPreview.hidden = true;
  urlPreview.innerHTML = `<img class="form-preview__img" alt="Image preview via URL">`;
  const urlPreviewImg = urlPreview.querySelector("img");

  fields.imageUrl.input.addEventListener("input", () => {
    const v = fields.imageUrl.input.value.trim();
    if (v) {
      urlPreviewImg.src = v;
      urlPreview.hidden = false;
    } else {
      urlPreview.hidden = true;
      urlPreviewImg.src = "";
    }
  });

  // Compose body
  const body = document.createElement("div");
  body.style.padding = "0 20px 10px";
  [
    fields.name.wrap,
    fields.importance.wrap,
    fields.weight.wrap,
    fields.price.wrap,
    fields.acquiredAt.wrap,
    fields.imageUrl.wrap,
    urlPreview,
    imageFileField.wrap,
    fields.description.wrap
  ].forEach(el => body.appendChild(el));

  const footer = document.createElement("div");
  footer.style.cssText = "display:flex;gap:8px;justify-content:flex-end;padding:10px 20px 20px";
  footer.innerHTML = `
    <button type="button" class="btn btn--ghost" data-cmd="cancel">Cancel</button>
    <button type="submit" class="btn" data-cmd="create">Create</button>
  `;

  form.append(body, footer);
  const overlay = openModal(form, { labelledBy: "dialog-title" });

  on(form, "click", (e) => {
    const cmd = e.target.closest("[data-cmd]")?.dataset.cmd;
    if (cmd === "cancel") { e.preventDefault(); closeModal(overlay); }
  });

  on(form, "submit", async (e) => {
    e.preventDefault();

    // Gather values
    const v = {
      name: fields.name.input.value.trim(),
      importance: fields.importance.input.value ? Number(fields.importance.input.value) : undefined,
      weight: fields.weight.input.value ? Number(fields.weight.input.value) : undefined,
      price: fields.price.input.value ? Number(fields.price.input.value) : undefined,
      acquiredAt: fields.acquiredAt.input.value || undefined,
      imageUrl: fields.imageUrl.input.value.trim() || undefined,
      description: fields.description.input.value.trim() || undefined
    };

    // Prefer the uploaded file (data URL) over the URL
    const dataUrl = await imageFileField.toDataURL();
    if (dataUrl) {
      v.image = dataUrl;     // inline image (base64)
      v.imageUrl = undefined;
    }

    // Validations
    let ok = true;
    showError(fields.name, "");
    showError(fields.importance, "");
    if (!v.name) { showError(fields.name, "Required"); ok = false; }
    if (v.importance === undefined || Number.isNaN(v.importance) || v.importance < 1 || v.importance > 10) {
      showError(fields.importance, "Importance must be between 1 and 10"); ok = false;
    }
    if (!ok) return;

    try {
      const created = await api.createItem(collectionId, v);
      state.items.unshift(created);
      renderItems(state.items, { append: false });
      if (state.collection) {
        state.collection.itemCount = (state.collection.itemCount || 0) + 1;
        state.collection.lastRecordAt = isoNow();
        renderStats(state.collection, state.collection.itemCount);
      }
      closeModal(overlay);
      showToast("Item created!", "success");
    } catch (err) {
      console.error(err); showToast("Could not create item.", "error");
    }
  });
}

  function modalManageCollection() {
    const c = state.collection || {};
    const form = document.createElement("form");
    form.setAttribute("novalidate", "true");
    form.innerHTML = `<div style="padding:20px 20px 0"><h2 id="dialog-title" style="font-size:18px;margin:0 0 8px">Manage Collection</h2><p style="margin:0 0 10px;opacity:.85">Update the collection information.</p></div>`;
    const fields = {
      title: buildFormField({ label: "Title", name: "title", required: true }),
      subtitle: buildFormField({ label: "Subtitle", name: "subtitle" }),
      coverImageUrl: buildFormField({ label: "Cover Image URL", name: "coverImageUrl", type: "url" }),
      type: buildFormField({ label: "Type", name: "type", type: "select", required: true }),
    };
    fields.title.input.value = c.title || "";
    fields.subtitle.input.value = c.subtitle || "";
    fields.coverImageUrl.input.value = c.coverImageUrl || "";
    fields.type.input.value = c.type || "Figure";

    const body = document.createElement("div");
    body.style.padding = "0 20px 10px";
    Object.values(fields).forEach(f => body.appendChild(f.wrap));
    const footer = document.createElement("div");
    footer.style.cssText = "display:flex;gap:8px;justify-content:flex-end;padding:10px 20px 20px";
    footer.innerHTML = `<button type="button" class="btn btn--ghost" data-cmd="cancel">Cancel</button><button type="submit" class="btn" data-cmd="save">Save</button>`;
    form.append(body, footer);
    const overlay = openModal(form, { labelledBy: "dialog-title" });

    on(form, "click", (e) => {
      const cmd = e.target.closest("[data-cmd]")?.dataset.cmd;
      if (cmd === "cancel") { e.preventDefault(); closeModal(overlay); }
    });

    on(form, "submit", async (e) => {
      e.preventDefault();
      const patch = {
        title: fields.title.input.value.trim(),
        subtitle: fields.subtitle.input.value.trim(),
        coverImageUrl: fields.coverImageUrl.input.value.trim(),
        type: fields.type.input.value,
      };
      if (!patch.title) { showToast("Title is required", "error"); return; }
      try {
        const updated = await api.updateCollection(collectionId, patch);
        state.collection = updated;
        renderCollectionHeader(updated);
        renderStats(updated, updated.itemCount || state.items.length);
        closeModal(overlay);
        showToast("Collection updated.", "success");
      } catch (err) {
        console.error(err); showToast("Could not update collection.", "error");
      }
    });
  }

  /** ----------------------------- Upgrade existing static cards ----------------------------- */
 function upgradeExistingCards() {
  if (!grid) return;
  qsa(".card", grid).forEach(card => {
    const id = card.dataset.itemId || uuid();
    card.dataset.itemId = id;

    const media = qs(".card__media", card);
    const titleLink = qs(".card__title a", card);
    const name = titleLink?.textContent?.trim() || "Item";
    const href = buildItemUrl(id); // ← unified routing

    if (media && !media.hasAttribute("data-href")) {
      media.setAttribute("data-href", href);
      media.setAttribute("role", "link");
      media.setAttribute("aria-label", `Open ${name}`);
    }
    if (titleLink) titleLink.setAttribute("href", href);

    if (media && !qs(".card__action--delete", media)) {
      const del = document.createElement("button");
      del.className = "card__action card__action--delete";
      del.title = `Delete item ${name}`;
      del.setAttribute("aria-label", `Delete item ${name}`);
      del.textContent = "×";
      media.appendChild(del);
    }
  });
}

  /** ----------------------------- Event Wiring ----------------------------- */
  function attachEvents() {
    if (btnAddItem) on(btnAddItem, "click", modalCreateItem);
    if (btnManage) on(btnManage, "click", modalManageCollection);
    if (viewMoreBtn) on(viewMoreBtn, "click", async () => { await loadItems({ append: true, page: state.page + 1 }); });
// PROFILE: procura por aria-label; se não achar, procura por texto "Profile"
let btnProfile = qs('button[aria-label="Open profile"]');
if (!btnProfile) {
  btnProfile = Array.from(document.querySelectorAll(".topbar .btn, .topbar__actions .btn"))
    .find(b => /profile/i.test(b.textContent || ""));
}
if (btnProfile) {
  on(btnProfile, "click", (e) => {
    e.preventDefault();
    openProfileMenuFor(btnProfile);
  });
}


    if (searchInput) {
      on(searchInput, "input", debounce(async () => {
        state.search = searchInput.value.trim(); await reloadItems();
      }, 250));
    }
    if (filterSelect) {
      on(filterSelect, "change", async () => {
        const v = filterSelect.value || "";
        const filters = {};
        if (v.startsWith("type:")) filters.type = v.split(":")[1];
        else if (v === "rarity:high") filters.rarity = "high";
        else if (v === "recent") filters.recent = true;
        state.filters = filters; await reloadItems();
      });
    }

    if (grid) {
      // delete
      on(grid, "click", ".card__action--delete", async (e, btn) => {
        e.preventDefault();
        const card = btn.closest(".card"); if (!card) return;
        const id = card.dataset.itemId;
        const name = qs(".card__title", card)?.textContent?.trim() || "item";
        const ok = await confirmDialog({
          title: "Delete item",
          message: `Are you sure you want to delete “${name}”? This action cannot be undone.`,
          confirmText: "Delete", cancelText: "Cancel"
        });
        if (!ok) return;
        try {
          await api.deleteItem(collectionId, id);
          state.items = state.items.filter(it => it.id !== id);
          card.style.transition = "all .25s ease"; card.style.opacity = "0"; card.style.transform = "scale(.98)";
          setTimeout(() => card.remove(), 250);
          if (state.collection) {
            state.collection.itemCount = clamp((state.collection.itemCount || 1) - 1, 0, 999999);
            state.collection.lastRecordAt = isoNow();
            renderStats(state.collection, state.collection.itemCount);
          }
          showToast("Item deleted.", "success");
        } catch (err) { console.error(err); showToast("Could not delete item.", "error"); }
      });

      // navigate
      on(grid, "click", ".card__media, .card__title a, .card", (e, el) => {
        if (e.target.closest(".card__action--delete")) return;
        const card = el.closest(".card");
        const href = el.getAttribute("data-href") || qs(".card__title a", card)?.getAttribute("href");
        if (href) { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); window.location.href = href; }
      });

      // enter key
      on(grid, "keydown", (e) => {
        if (e.key === "Enter") {
          const card = e.target.closest(".card");
          if (card && grid.contains(card)) {
            const href = qs(".card__title a", card)?.getAttribute("href");
            if (href) { e.preventDefault(); window.location.href = href; }
          }
        }
      });
    }
  }

  /** ----------------------------- Data Loading ----------------------------- */
  async function loadCollection() {
    let collection = await api.getCollection(collectionId);
    if (!collection) {
      collection = await api.updateCollection(collectionId, {
        id: collectionId,
        title: qs(".hero__title", main)?.textContent?.trim() || "My Collection",
        subtitle: qs(".hero__subtitle", main)?.textContent?.trim() || "",
        type: "Miniatures",
        itemCount: qsa(".grid .card", main).length || 0,
        createdAt: new Date("2023-01-12").toISOString(),
        lastRecordAt: isoNow(),
        coverImageUrl: qs(".hero__media img", main)?.src || "",
      });
    }
    state.collection = collection;
    renderCollectionHeader(collection);
    renderStats(collection, collection.itemCount || 0);
  }

  async function loadItems({ append = false, page = 1 } = {}) {
    const res = await api.listItems(collectionId, {
      page, pageSize: state.pageSize, search: state.search, filters: state.filters
    });
    state.page = res.page;
    setViewMoreState(res.hasMore);
    if (append) {
      state.items = state.items.concat(res.items);
      renderItems(res.items, { append: true });
    } else {
      state.items = res.items.slice();
      renderItems(state.items, { append: false });
    }
  }
  async function reloadItems() { setViewMoreState(true); state.page = 1; await loadItems({ append: false, page: 1 }); }

  /** ----------------------------- Seed (optional) ----------------------------- */
  async function seedMockDataFromStaticGridIfEmpty() {
    // If local storage empty, use existing static cards as initial dataset
    const res = await api.listItems(collectionId, { page: 1, pageSize: 1 });
    if (res.total && res.total > 0) return;
    const staticCards = qsa(".grid .card", main);
    if (!staticCards.length) return;
    for (const card of staticCards) {
      const id = card.dataset.itemId || uuid();
      const name = qs(".card__title", card)?.textContent?.trim() || "Item";
      const typeYear = qs(".card__meta", card)?.textContent?.trim() || "";
      const type = typeYear.split("·")[0]?.trim() || "Figure";
      const year = Number((typeYear.split("·")[1] || "").trim()) || undefined;
      const rarityText = qs(".badge", card)?.textContent?.trim() || "";
      const rarity = rarityText.startsWith("R") ? Number(rarityText.slice(1)) : undefined;
      const imageUrl = qs(".card__media img", card)?.src || undefined;
      await api.createItem(collectionId, { id, name, type, year, rarity, imageUrl });
    }
  }

  /** ----------------------------- Init ----------------------------- */
  async function init() {
    try {
      // First, upgrade any static cards in DOM
      upgradeExistingCards();
      await loadCollection();
      await seedMockDataFromStaticGridIfEmpty();
      await loadItems({ append: false, page: 1 });
      attachEvents();
      showToast("Collection ready.", "success", 1800);
    } catch (err) {
      console.error(err);
      showToast("Failed to initialize the page.", "error", 4000);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
