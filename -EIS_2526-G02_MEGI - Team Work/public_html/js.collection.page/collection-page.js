/**
 * collection-page.js (PHP-integrated + Events)
 * - Works with the provided HTML
 * - Lists/searches/filters items, creates/deletes (localStorage)
 * - Navigates to item page on click
 * - Wires "Events" navigation
 * - Integrado com collections_api.php (coleções) e events_api.php (eventos)
 */
(() => {
  "use strict";

  /** ----------------------------- Config & route helpers ----------------------------- */
  const APP_BASE = (document.querySelector('meta[name="app-base"]')?.getAttribute('content') || '').replace(/\/+$/, '') + '';

  const ITEM_PAGE_PATH = (
    document.querySelector('meta[name="item-page-path"]')?.getAttribute('content') || 'index.html'
  ).replace(/^\/+/, '');

  const EVENTS_PAGE_PATH = (
    document.querySelector('meta[name="events-page-path"]')?.getAttribute('content') || 'event.html'
  ).replace(/^\/+/, '');

  /** Build canonical URLs */
  const buildItemUrl = (itemId) => {
    const base = APP_BASE ? `${APP_BASE}/` : '';
    const c = collectionId || 'demo-collection'; // collectionId é declarado mais em baixo; usado só depois do init
    return `${base}${ITEM_PAGE_PATH}?id=${encodeURIComponent(itemId)}&c=${encodeURIComponent(c)}`;
  };

  function buildEventsUrl() {
    const base = APP_BASE ? `${APP_BASE}/` : '';
    const cid = (typeof collectionId !== 'undefined' && collectionId) ? collectionId : 'default-collection';
    return `${base}${EVENTS_PAGE_PATH}?c=${encodeURIComponent(cid)}`;
  }

  // ========================================================================
  // Create New Collection (modal integrado com PHP)
  // ========================================================================
  const COLLECTIONS_LS_KEY = 'collections-data';

  function openCreateCollectionModal() {
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

    // === SUBMIT -> ENVIA PARA PHP ===
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

      const payload = new FormData();
      payload.append('action', 'create');
      payload.append('name', name);
      payload.append('type', type);
      payload.append('creation_date', dateCreated);
      payload.append('description', desc);
      payload.append('image', img);

      fetch('collections_api.php', {
        method: 'POST',
        body: payload
      })
        .then((res) => res.json())
        .then((result) => {
          if (!result || !result.success) {
            const msg = result && result.error ? result.error : 'Erro ao criar coleção.';
            alert(msg);
            return;
          }

          close();

          const redirectUrl =
            result.redirect_url ||
            `collection-page.html?id=${encodeURIComponent(result.collection_id)}`;

          window.location.href = redirectUrl;
        })
        .catch((err) => {
          console.error(err);
          alert('Erro inesperado ao criar coleção.');
        });
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

  /** ----------------------------- Utilities ----------------------------- */
  // Robust UUID: prefers crypto.randomUUID; otherwise generates a pseudo-UUID (RFC-ish)
  function safeUUID() {
    // Try native
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        // RFC4122 v4 using getRandomValues
        const buf = new Uint8Array(16);
        crypto.getRandomValues(buf);
        buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
        buf[8] = (buf[8] & 0x3f) | 0x80; // variant
        const b2hex = (b) => b.toString(16).padStart(2, '0');
        const hex = Array.from(buf, b2hex).join('');
        return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      }
    } catch {}
    // Fallback pseudo
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
      const r = Math.random() * 16 | 0;
      const v = ch === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  const uuid = () => safeUUID();

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
  const debounce = (fn, wait = 250) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, args), wait); }; };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const isoNow = () => new Date().toISOString();

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

  /** ----------------------------- Simple modals ----------------------------- */
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
    box.appendChild(content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const firstInput = qsa("input, select, textarea, button", overlay).find(el => !el.disabled);
    (firstInput || overlay).focus();
    on(overlay, "click", (e) => { if (e.target === overlay) closeModal(overlay); });
    return overlay;
  }
  function closeModal(overlay) {
    if (!overlay) return;
    overlay.remove();
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

  /** ----------------------------- State & DOM ----------------------------- */
  const main = qs("#main-content");
  if (!main) { console.warn("[collection-page.js] #main-content not found"); return; }

  // pega ?id= da URL (coleção criada) OU data-collection-id (template antigo)
  const urlParams = new URLSearchParams(window.location.search);
  const collectionIdFromUrl = urlParams.get('id');
  const collectionId = collectionIdFromUrl || main.dataset.collectionId || "demo-collection";

  // garante que o resto do código (e os hotfixes) vejam esse id
  if (collectionIdFromUrl) {
    main.dataset.collectionId = collectionIdFromUrl;
  }

  const state = {
    page: 1, pageSize: 9, hasMore: true,
    search: "", filters: {}, collection: null, items: [],
  };

  const grid = qs("section.grid[aria-label='Collection items grid'], section.grid", main) || qs(".grid", main);
  const viewMoreBtn = qs('.loadmore .btn[aria-label="View more items"], .loadmore .btn', main);
  const heroTitle = qs(".hero .hero__title", main);
  const heroSubtitle = qs(".hero .hero__subtitle", main);
  const heroImg = qs(".hero .hero__media img", main);
  const statsAside = qs("aside.stats");
  const searchInput = qs("#search-input", main);
  const filterSelect = qs("#filter-select", main);
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
        <button 
  type="button"
  class="card__action card__action--delete"
  title="Delete item ${escapeHTML(it.name || "")}"
  aria-label="Delete item ${escapeHTML(it.name || "")}"
>×</button>        
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

  /** ----------------------------- Form helpers (textarea & image) ----------------------------- */
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

  /** ----------------------------- API layer (localStorage para ITENS) ----------------------------- */
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

  /** ----------------------------- Rendering & upgrade ----------------------------- */
  function upgradeExistingCards() {
    if (!grid) return;
    qsa(".card", grid).forEach(card => {
      const id = card.dataset.itemId || uuid();
      card.dataset.itemId = id;

      const media = qs(".card__media", card);
      const titleLink = qs(".card__title a", card);
      const name = titleLink?.textContent?.trim() || "Item";
      const href = buildItemUrl(id);

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

  /** ----------------------------- Events button (top nav) ----------------------------- */
  function wireEventsButton() {
    const targetHref = buildEventsUrl();
    const prefer = document.querySelector('[data-nav="events"]')
      || document.getElementById('eventsBtn')
      || document.querySelector('.events-btn');

    if (prefer) {
      if (prefer.tagName === 'A') prefer.setAttribute('href', targetHref);
      prefer.addEventListener('click', (e) => {
        if (prefer.tagName !== 'A') e.preventDefault();
        window.location.href = targetHref;
      });
      return;
    }
    // Fallback by text
    document.querySelectorAll('a,button').forEach(el => {
      const text = (el.textContent || '').trim().toLowerCase();
      if (text === 'events') {
        if (el.tagName === 'A') el.setAttribute('href', targetHref);
        el.addEventListener('click', (e) => {
          if (el.tagName !== 'A') e.preventDefault();
          window.location.href = targetHref;
        });
      }
    });
  }

  // Cria (ou encontra) o botão "Create Event" na seção de ações da coleção
  function ensureCreateEventButton() {
    const actionsSection = qs("section.actions", main);
    if (!actionsSection) return null;

    let btn = qs('button[aria-label="Create event for this collection"]', actionsSection);
    if (btn) return btn;

    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--secondary btn--lg";
    btn.setAttribute("aria-label", "Create event for this collection");
    btn.innerHTML = `<span>Create Event</span>`;

    actionsSection.appendChild(btn);
    return btn;
  }

  /** ----------------------------- Create item modal ----------------------------- */
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

        // Immediately navigate to the item's page so it behaves like "a page of Index"
        window.location.href = buildItemUrl(created.id);
        return; // stop UI updates since we are navigating

      } catch (err) {
        console.error(err); showToast("Could not create item.", "error");
      }
    });
  }

  /** ----------------------------- Create event modal (based on collection) ----------------------------- */
  function modalCreateEvent() {
    const c = state.collection || {};

    const form = document.createElement("form");
    form.setAttribute("novalidate", "true");
    form.innerHTML = `
      <div style="padding:20px 20px 0">
        <h2 id="dialog-title-event" style="font-size:18px;margin:0 0 8px">Create Event</h2>
        <p style="margin:0 0 10px;opacity:.85">
          Create an event related to this collection.
        </p>
        <p style="margin:0 0 10px;font-size:13px;opacity:.75">
          Collection: <strong>${escapeHTML(c.title || "My Collection")}</strong>
        </p>
      </div>
    `;

    // Campos básicos do evento
    const fields = {
      name:       buildFormField({ label: "Event name", name: "name", required: true }),
      location:   buildFormField({ label: "Location", name: "location", required: true }),
      date:       buildFormField({ label: "Date", name: "date", type: "date", required: true }),
      description: buildTextAreaField({ label: "Description", name: "description", rows: 4 })
    };

    // Valores padrão
    fields.name.input.value = c.title ? `${c.title} event` : "";
    fields.date.input.value = new Date().toISOString().slice(0, 10);
    fields.description.input.value =
      c.subtitle ||
      `Event related to collection "${c.title || "My Collection"}".`;

    const body = document.createElement("div");
    body.style.padding = "0 20px 10px";
    body.appendChild(fields.name.wrap);
    body.appendChild(fields.location.wrap);
    body.appendChild(fields.date.wrap);
    body.appendChild(fields.description.wrap);

    const footer = document.createElement("div");
    footer.style.cssText = "display:flex;gap:8px;justify-content:flex-end;padding:10px 20px 20px";
    footer.innerHTML = `
      <button type="button" class="btn btn--ghost" data-cmd="cancel">Cancel</button>
      <button type="submit" class="btn" data-cmd="create">Create event</button>
    `;

    form.append(body, footer);
    const overlay = openModal(form, { labelledBy: "dialog-title-event" });

    // Botão cancel
    on(form, "click", (e) => {
      const cmd = e.target.closest("[data-cmd]")?.dataset.cmd;
      if (cmd === "cancel") {
        e.preventDefault();
        closeModal(overlay);
      }
    });

    // Submit -> POST para events_api.php
    on(form, "submit", async (e) => {
      e.preventDefault();

      const v = {
        name: fields.name.input.value.trim(),
        location: fields.location.input.value.trim(),
        date: fields.date.input.value.trim(),
        description: fields.description.input.value.trim()
      };

      // Limpa erros
      showError(fields.name, "");
      showError(fields.location, "");
      showError(fields.date, "");

      let ok = true;
      if (!v.name)      { showError(fields.name, "Required"); ok = false; }
      if (!v.location)  { showError(fields.location, "Required"); ok = false; }
      if (!v.date)      { showError(fields.date, "Required"); ok = false; }

      if (!v.description) {
        v.description = `Event related to collection "${c.title || "My Collection"}".`;
      }

      if (!ok) return;

      try {
        const fd = new FormData();
        // O backend espera o ID da coleção em "collection"
        fd.append("collection", collectionId);
        fd.append("name", v.name);
        fd.append("location", v.location);
        fd.append("date", v.date);
        fd.append("description", v.description);
        // Não vamos mandar imagem aqui; o PHP lida com imagePath = null

        const res = await fetch("events_api.php", {
          method: "POST",
          body: fd
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Could not create event.");
        }

        closeModal(overlay);
        showToast("Event created.", "success");

        // Redireciona para a página de eventos da coleção
        const targetHref = buildEventsUrl();
        window.location.href = targetHref;

      } catch (err) {
        console.error(err);
        showToast("Could not create event.", "error");
      }
    });
  }

  /** ----------------------------- Manage Collection modal ----------------------------- */
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

  /** ----------------------------- Event wiring ----------------------------- */
  function attachEvents() {
    if (btnAddItem) on(btnAddItem, "click", modalCreateItem);
    if (btnManage) on(btnManage, "click", modalManageCollection);

    // Botão "Create Event"
    const btnCreateEvent = ensureCreateEventButton();
    if (btnCreateEvent) {
      on(btnCreateEvent, "click", (e) => {
        e.preventDefault();
        modalCreateEvent();
      });
    }

    if (viewMoreBtn) on(viewMoreBtn, "click", async () => { await loadItems({ append: true, page: state.page + 1 }); });

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
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();

        const card = btn.closest(".card");
        if (!card) return;
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

      // navigate (card media/title)
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

  /** ----------------------------- Data loading ----------------------------- */
  async function loadCollection() {
    try {
      // Busca a coleção direto no PHP
      const res = await fetch(`collections_api.php?id=${encodeURIComponent(collectionId)}`);
      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }

      const data = await res.json();
      if (!data.success || !data.collection) {
        throw new Error(data.error || 'Collection not found');
      }

      const c = data.collection;

      const mapped = {
        id: String(c.collection_id),
        title: c.name || 'My Collection',
        subtitle: c.description || '',
        coverImageUrl: c.image || (qs('.hero__media img', main)?.src || ''),
        type: c.type || 'Collection',
        createdAt: c.creation_date
          ? new Date(c.creation_date).toISOString()
          : isoNow(),
        itemCount:
          typeof c.number_of_items === 'number'
            ? c.number_of_items
            : 0,
        lastRecordAt: null,
      };

      // sincroniza com o "banco" local de collections (localStorage)
      try {
        await api.updateCollection(mapped.id, mapped);
      } catch (err) {
        console.warn('[loadCollection] could not sync local collection store', err);
      }

      state.collection = mapped;
      renderCollectionHeader(mapped);
      renderStats(mapped, mapped.itemCount);
    } catch (err) {
      console.error(err);
      showToast('Could not load collection information from server.', 'error');

      // Fallback: usa dados da página
      const fallback = {
        id: collectionId,
        title: qs('.hero__title', main)?.textContent?.trim() || 'My Collection',
        subtitle: qs('.hero__subtitle', main)?.textContent?.trim() || '',
        coverImageUrl: qs('.hero__media img', main)?.src || '',
        type: 'Collection',
        createdAt: isoNow(),
        itemCount: 0,
        lastRecordAt: null,
      };
      state.collection = fallback;
      renderCollectionHeader(fallback);
      renderStats(fallback, fallback.itemCount);
    }
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
  function ready(fn){ document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  async function init() {
    try {
      upgradeExistingCards();
      await loadCollection();
      await seedMockDataFromStaticGridIfEmpty();
      await loadItems({ append: false, page: 1 });
      attachEvents();
      wireEventsButton();
      attachCreateCollectionHandler();
      showToast("Collection ready.", "success", 1800);
    } catch (err) {
      console.error(err);
      showToast("Failed to initialize the page.", "error", 4000);
    }
  }
  ready(init);
})();

/* ==== COLLECTA Safe Hotfix (Collection Page) =================================
   Purpose:
   - Ensure cards always link and Events button navigates
   - Robust delegated handlers even if DOM changes after render
============================================================================= */
(() => {
  function getMeta(name, fallback) {
    const v = document.querySelector(`meta[name="${name}"]`)?.getAttribute('content');
    return (v ?? fallback ?? '').toString();
  }
  function getAppBase() { return getMeta('app-base', '').replace(/\/+$/, ''); }
  function getCollectionId() {
    try { if (typeof collectionId !== 'undefined' && collectionId) return collectionId; } catch {}
    const main = document.getElementById('main-content');
    return main?.dataset.collectionId || 'default-collection';
  }
  function buildItemUrl(id) {
    const base = getAppBase() ? `${getAppBase()}/` : '';
    const itemPath = getMeta('item-page-path', 'index.html').replace(/^\/+/, '');
    const cid = getCollectionId();
    return `${base}${itemPath}?id=${encodeURIComponent(id)}&c=${encodeURIComponent(cid)}`;
  }
  function buildEventsUrl() {
    const base = getAppBase() ? `${getAppBase()}/` : '';
    const eventsPath = getMeta('events-page-path', 'event.html').replace(/^\/+/, '');
    const cid = getCollectionId();
    return `${base}${eventsPath}?c=${encodeURIComponent(cid)}`;
  }

  function ensureCardLinks() {
    const grid = document.querySelector('[data-grid], .grid, .cards, #grid, main');
    if (!grid) return;
    grid.querySelectorAll('.card').forEach(card => {
      let id = card.dataset.itemId;
      if (!id) {
        id = `it_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
        card.dataset.itemId = id;
      }
      const href = buildItemUrl(id);
      const media = card.querySelector('.card__media');
      const titleA = card.querySelector('.card__title a');
      if (media) {
        media.setAttribute('data-href', href);
        media.setAttribute('role', 'link');
        media.setAttribute('tabindex', '0');
      }
      if (titleA) titleA.setAttribute('href', href);
    });
  }

  function wireEventsButton() {
    const targetHref = buildEventsUrl();
    const prefer = document.querySelector('[data-nav="events"]')
      || document.getElementById('eventsBtn')
      || document.querySelector('.events-btn');

    if (prefer) {
      if (prefer.tagName === 'A') prefer.setAttribute('href', targetHref);
      prefer.addEventListener('click', (e) => {
        if (prefer.tagName !== 'A') e.preventDefault();
        window.location.href = targetHref;
      });
      return;
    }
    document.querySelectorAll('a,button').forEach(el => {
      const text = (el.textContent || '').trim().toLowerCase();
      if (text === 'events') {
        if (el.tagName === 'A') el.setAttribute('href', targetHref);
        el.addEventListener('click', (e) => {
          if (el.tagName !== 'A') e.preventDefault();
          window.location.href = targetHref;
        });
      }
    });
  }

  function installDelegatedHandlers() {
    document.addEventListener('click', (e) => {
      // Se o clique foi no botão de delete, não navega
      if (e.target.closest?.('.card__action--delete')) return;

      const media = e.target.closest?.('.card__media');
      if (media && media.hasAttribute('data-href')) {
        const href = media.getAttribute('data-href');
        if (href) { e.preventDefault(); window.location.href = href; return; }
      }
      const linkish = e.target.closest?.('[data-href]');
      if (linkish && !linkish.getAttribute('href')) {
        const href = linkish.getAttribute('data-href');
        if (href) { e.preventDefault(); window.location.href = href; return; }
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const el = e.target;
      if (el && el.classList?.contains('card__media') && el.hasAttribute('data-href')) {
        const href = el.getAttribute('data-href');
        if (href) { e.preventDefault(); window.location.href = href; }
      }
    });
  }

  function ready(fn){ document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(() => {
    try { ensureCardLinks(); } catch (err) { console.error('[collecta] ensureCardLinks failed', err); }
    try { wireEventsButton(); } catch (err) { console.error('[collecta] wireEventsButton failed', err); }
    try { installDelegatedHandlers(); } catch (err) { console.error('[collecta] delegated handlers failed', err); }
  });
})();

/* === Universal Nav (Collection Page) ========================================
   Purpose:
   - Wire "Events" and "Collections" buttons
   - Preserve ?c=<collectionId> on navigation
   - No globals leaked
============================================================================= */
(() => {
  // --- Small helpers (local only) ---
  const getMeta = (n, f='') => (document.querySelector(`meta[name="${n}"]`)?.getAttribute('content') ?? f) + '';
  const APP_BASE = getMeta('app-base').replace(/\/+$/, '');
  const ITEM_PAGE = getMeta('item-page-path', 'index.html').replace(/^\/+/, '');
  const EVENTS_PAGE = getMeta('events-page-path', 'event.html').replace(/^\/+/, '');
  const COLLECTION_PAGE = getMeta('collection-page-path', 'collection-page.html').replace(/^\/+/, '');

  const main = document.getElementById('main-content');
  const COLLECTION_ID = main?.dataset.collectionId || 'default-collection';

  const withBase = (p) => (APP_BASE ? `${APP_BASE}/` : '') + p;
  const buildEventsUrl = () => withBase(`${EVENTS_PAGE}?c=${encodeURIComponent(COLLECTION_ID)}`);
  const buildCollectionsUrl = () => withBase(`${COLLECTION_PAGE}?c=${encodeURIComponent(COLLECTION_ID)}`);

  function wireByTextOrData(selectorText, url) {
    // Priority: data-nav attribute
    const prefer = document.querySelector(`[data-nav="${selectorText}"]`);
    if (prefer) {
      if (prefer.tagName === 'A') prefer.setAttribute('href', url);
      prefer.addEventListener('click', (e) => { if (prefer.tagName !== 'A') e.preventDefault(); window.location.href = url; });
    }
    // Fallback: any element whose visible text matches
    document.querySelectorAll('a,button').forEach(el => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (t === selectorText) {
        if (el.tagName === 'A') el.setAttribute('href', url);
        el.addEventListener('click', (e) => { if (el.tagName !== 'A') e.preventDefault(); window.location.href = url; });
      }
    });
  }

  function ready(fn){ document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(() => {
    wireByTextOrData('events', buildEventsUrl());
    wireByTextOrData('collections', buildCollectionsUrl());
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
        console.log('[profile] open profile');
      } else if (cmd === 'logout') {
        try {
          Object.keys(localStorage).forEach(k => { if (k.startsWith('collecta:')) localStorage.removeItem(k); });
        } catch {}
        console.log('[profile] logout');
        setTimeout(() => window.location.reload(), 200);
      }
      closeProfileMenu();
    });

    // Close on outside interactions
    document.addEventListener('click', onDocClick, true);
    window.addEventListener('resize', closeProfileMenu);
    window.addEventListener('scroll', closeProfileMenu, true);

    const first = menu.querySelector('.menu__item');
    if (first) first.focus();

    openMenuEl = menu;
  }

  /** Find the "Profile" trigger robustly */
  function findProfileButton() {
    // Priority: aria-label exact
    let btn = document.querySelector('button[aria-label="Open profile"], [data-nav="profile"]');

    if (!btn) {
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
    if (!trigger.getAttribute('aria-haspopup')) trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openProfileMenuFor(trigger);
      trigger.setAttribute('aria-expanded', 'true');
    });
  });
})();
