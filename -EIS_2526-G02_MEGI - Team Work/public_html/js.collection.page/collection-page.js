/**
 * collection-page.js (DB Collection + localStorage Items)
 *
 * - Collection: loaded from collections_api.php?id=<collectionId>
 * - Items: stored locally in localStorage (as requested)
 * - Create Event: redirects to event.html?c=<collectionId>&open=create (auto-open modal on Events page)
 */

(() => {
  "use strict";

  /** ----------------------------- Meta config helpers ----------------------------- */
  const getMeta = (name, fallback = "") =>
    (document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? fallback).toString();

  const APP_BASE = getMeta("app-base", "").replace(/\/+$/, "");
  const ITEM_PAGE_PATH = getMeta("item-page-path", "index.html").replace(/^\/+/, "");
  const EVENTS_PAGE_PATH = getMeta("events-page-path", "event.html").replace(/^\/+/, "");
  const COLLECTION_PAGE_PATH = getMeta("collection-page-path", "collection-page.html").replace(/^\/+/, "");

  const withBase = (p) => (APP_BASE ? `${APP_BASE}/` : "") + p;

  /** ----------------------------- DOM helpers ----------------------------- */
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));
  const on = (el, evt, selOrHandler, handler) => {
    if (!el) return;
    if (typeof selOrHandler === "function") {
      el.addEventListener(evt, selOrHandler);
    } else {
      el.addEventListener(evt, (e) => {
        const target = e.target.closest(selOrHandler);
        if (target && el.contains(target)) handler(e, target);
      });
    }
  };

  function escapeHTML(value) {
    const s = String(value ?? "");
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return s.replace(/[&<>"']/g, (ch) => map[ch]);
  }

  /** ----------------------------- Basic utilities ----------------------------- */
  function isoNow() {
    return new Date().toISOString();
  }

  function safeUUID() {
    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        const buf = new Uint8Array(16);
        crypto.getRandomValues(buf);
        buf[6] = (buf[6] & 0x0f) | 0x40;
        buf[8] = (buf[8] & 0x3f) | 0x80;
        const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      }
    } catch {}
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
      const r = (Math.random() * 16) | 0;
      const v = ch === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const debounce = (fn, wait = 250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  };

  /** ----------------------------- Toasts ----------------------------- */
  let toastRoot = null;

  function ensureToastRoot() {
    if (toastRoot) return;
    toastRoot = document.createElement("div");
    toastRoot.setAttribute("aria-live", "polite");
    toastRoot.setAttribute("role", "status");
    Object.assign(toastRoot.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    });
    document.body.appendChild(toastRoot);
  }

  function showToast(message, type = "info", timeout = 2500) {
    ensureToastRoot();
    const el = document.createElement("div");
    el.textContent = message;
    Object.assign(el.style, {
      background: type === "error" ? "#B00020" : type === "success" ? "#0B8A83" : "#333",
      color: "white",
      padding: "10px 14px",
      borderRadius: "10px",
      boxShadow: "0 8px 24px rgba(0,0,0,.2)",
      fontSize: "14px",
      maxWidth: "320px",
    });
    toastRoot.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      el.style.transition = "all .25s ease";
      setTimeout(() => el.remove(), 250);
    }, timeout);
  }

  /** ----------------------------- Simple modal system ----------------------------- */
  let lastFocus = null;

  function openModal(content, { labelledBy = "dialog-title" } = {}) {
    lastFocus = document.activeElement;

    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", labelledBy);

    Object.assign(overlay.style, {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.4)",
      display: "grid",
      placeItems: "center",
      zIndex: 9998,
      padding: "16px",
    });

    const box = document.createElement("div");
    Object.assign(box.style, {
      width: "min(560px, 100%)",
      background: "var(--surface, #fff)",
      color: "inherit",
      borderRadius: "16px",
      boxShadow: "0 20px 60px rgba(0,0,0,.25)",
      overflow: "hidden",
    });

    box.appendChild(content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const firstInput = qsa("input, select, textarea, button", overlay).find((x) => !x.disabled);
    (firstInput || overlay).focus();

    on(overlay, "click", (e) => {
      if (e.target === overlay) closeModal(overlay);
    });

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
          <h2 id="dialog-title" style="font-size:18px;margin:0 0 8px">${escapeHTML(title)}</h2>
          <p style="margin:0 0 16px;opacity:.85">${escapeHTML(message)}</p>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding:16px 20px 20px">
          <button class="btn btn--ghost" data-cmd="cancel">${escapeHTML(cancelText)}</button>
          <button class="btn" data-cmd="confirm">${escapeHTML(confirmText)}</button>
        </div>
      `;
      const overlay = openModal(wrap, { labelledBy: "dialog-title" });
      on(wrap, "click", (e) => {
        const cmd = e.target.closest("[data-cmd]")?.dataset.cmd;
        if (!cmd) return;
        e.preventDefault();
        closeModal(overlay);
        resolve(cmd === "confirm");
      });
    });
  }

  /** ----------------------------- Form builders (Item only) ----------------------------- */
  function buildFormField({ label, name, type = "text", required = false, attrs = {} }) {
    const id = `f_${name}_${Math.random().toString(36).slice(2, 7)}`;
    const wrap = document.createElement("div");
    wrap.style.margin = "8px 0 12px";
    wrap.innerHTML = `
      <label for="${id}" style="display:block;font-weight:600;margin-bottom:6px">${escapeHTML(label)}${
      required ? " *" : ""
    }</label>
      <input id="${id}" name="${escapeHTML(name)}" type="${escapeHTML(type)}" ${
      required ? "required" : ""
    } style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px">
      <div class="field-error" aria-live="polite" style="color:#B00020;font-size:12px;margin-top:6px;height:0;overflow:hidden"></div>
    `;
    const input = qs("input", wrap);
    Object.entries(attrs || {}).forEach(([k, v]) => input.setAttribute(k, v));
    return { wrap, input, errorEl: qs(".field-error", wrap) };
  }

  function buildTextAreaField({ label, name, required = false, rows = 4 }) {
    const id = `f_${name}_${Math.random().toString(36).slice(2, 7)}`;
    const wrap = document.createElement("div");
    wrap.style.margin = "8px 0 12px";
    wrap.innerHTML = `
      <label for="${id}" style="display:block;font-weight:600;margin-bottom:6px">${escapeHTML(label)}${
      required ? " *" : ""
    }</label>
      <textarea id="${id}" name="${escapeHTML(name)}" rows="${rows}" ${
      required ? "required" : ""
    } style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;resize:vertical"></textarea>
    `;
    const input = qs("textarea", wrap);
    return { wrap, input };
  }

  function showFieldError(field, msg) {
    if (!field || !field.errorEl) return;
    field.errorEl.textContent = msg || "";
    field.errorEl.style.height = msg ? "auto" : "0";
  }

  /** ----------------------------- Page & collection id ----------------------------- */
  const main = qs("#main-content");
  if (!main) {
    console.warn("[collection-page.js] #main-content not found");
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const collectionIdFromUrl = urlParams.get("id");
  const collectionId = collectionIdFromUrl || main.dataset.collectionId || "demo-collection";
  if (collectionIdFromUrl) main.dataset.collectionId = collectionIdFromUrl;

  /** ----------------------------- URL builders ----------------------------- */
  function buildItemUrl(itemId) {
    const cid = collectionId || "demo-collection";
    return withBase(`${ITEM_PAGE_PATH}?id=${encodeURIComponent(itemId)}&c=${encodeURIComponent(cid)}`);
  }

  function buildEventsUrl() {
    const cid = collectionId || "default-collection";
    return withBase(`${EVENTS_PAGE_PATH}?c=${encodeURIComponent(cid)}`);
  }

  function buildCollectionsUrl() {
    return withBase(`${COLLECTION_PAGE_PATH}`);
  }

  /** ----------------------------- State ----------------------------- */
  const state = {
    page: 1,
    pageSize: 9,
    hasMore: true,
    search: "",
    filters: {},
    collection: null,
    items: [],
  };

  /** ----------------------------- DOM nodes ----------------------------- */
  const grid = qs("section.grid", main) || qs(".grid", main);
  const viewMoreBtn = qs(".loadmore .btn", main);

  const heroTitle = qs(".hero__title", main);
  const heroSubtitle = qs(".hero__subtitle", main);
  const heroImg = qs(".hero__media img", main);

  const statsAside = qs("aside.stats");
  const searchInput = qs("#search-input", main);
  const filterSelect = qs("#filter-select", main);

  const btnAddItem = qs("#addItemBtn", main);

  /** ----------------------------- Rendering ----------------------------- */
  function renderCollectionHeader(c) {
    if (heroTitle) heroTitle.textContent = c.title || "Untitled Collection";
    if (heroSubtitle) heroSubtitle.textContent = c.subtitle || "";
    if (heroImg && c.coverImageUrl) {
      heroImg.src = c.coverImageUrl;
      heroImg.alt = c.title ? `${c.title} cover image` : "Collection cover image";
    }
  }

  function renderStats(c, itemsCount) {
    if (!statsAside) return;
    const rows = qsa(".stats__row", statsAside);

    const getDD = (label) => {
      const row = rows.find((r) => (qs("dt", r)?.textContent || "").trim().toLowerCase() === label.toLowerCase());
      return row ? qs("dd", row) : null;
    };

    const ddCreated = getDD("Created");
    const ddType = getDD("Type");
    const ddCount = getDD("Number of Items");
    const ddLast = getDD("Last Record");

    if (ddCreated) ddCreated.textContent = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—";
    if (ddType) ddType.textContent = c.type || "—";
    if (ddCount) ddCount.textContent = String(itemsCount ?? c.itemCount ?? state.items.length ?? 0);
    if (ddLast) ddLast.textContent = c.lastRecordAt ? new Date(c.lastRecordAt).toLocaleString() : "—";
  }

  function cardImageSrc(it) {
    return it.image || it.imageUrl || "https://picsum.photos/seed/placeholder/400/300";
  }

  function metaText(it) {
    const parts = [];
    if (typeof it.importance === "number") parts.push(`Importance ${clamp(it.importance, 1, 10)}`);
    if (it.acquiredAt) parts.push(new Date(it.acquiredAt).toLocaleDateString());
    if (typeof it.price === "number") parts.push(`Price ${it.price}`);
    return parts.join(" · ");
  }

  function cardTemplate(it) {
    const href = buildItemUrl(it.id);
    const badge =
      typeof it.importance === "number"
        ? `<span class="badge" title="Importance ${clamp(it.importance, 1, 10)}">I${clamp(it.importance, 1, 10)}</span>`
        : "";

    return `
      <article class="card" data-item-id="${escapeHTML(it.id)}" tabindex="0">
        <div class="card__media" data-href="${escapeHTML(href)}">
          <img alt="${escapeHTML(it.name || "Item image")}" src="${escapeHTML(cardImageSrc(it))}"/>
          ${badge}
          <button type="button" class="card__action card__action--delete" title="Delete" aria-label="Delete">×</button>
        </div>
        <div class="card__body">
          <h3 class="card__title">
            <a href="${escapeHTML(href)}">${escapeHTML(it.name || "Item")}</a>
          </h3>
          <p class="card__meta">${escapeHTML(metaText(it))}</p>
          ${it.description ? `<p class="card__desc">${escapeHTML(it.description)}</p>` : ""}
        </div>
      </article>
    `;
  }

  function renderItems(items, { append = false } = {}) {
    if (!grid) return;
    const html = items.map(cardTemplate).join("");
    if (append) {
      const temp = document.createElement("div");
      temp.innerHTML = html;
      grid.append(...temp.children);
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

  /** ----------------------------- Local items API (localStorage) ----------------------------- */
  function localApi() {
    const KEY_ITEMS = (id) => `collecta:items:${id}`;
    const KEY_COLLECTIONS = "collecta:collections";

    function readJSON(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    }

    function writeJSON(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }

    return {
      async syncCollection(id, patch) {
        const all = readJSON(KEY_COLLECTIONS, {});
        const current = all[id] || { id };
        all[id] = { ...current, ...patch };
        writeJSON(KEY_COLLECTIONS, all);
        return all[id];
      },

      async listItems(id, { page = 1, pageSize = 9, search = "", filters = {} }) {
        let items = readJSON(KEY_ITEMS(id), []);

        if (search) {
          const s = search.toLowerCase();
          items = items.filter(
            (it) =>
              (it.name || "").toLowerCase().includes(s) ||
              (it.type || "").toLowerCase().includes(s) ||
              String(it.year || "").includes(s)
          );
        }

        if (filters.type) items = items.filter((it) => (it.type || "").toLowerCase() === String(filters.type).toLowerCase());
        if (filters.rarity === "high") items = items.filter((it) => Number(it.rarity || 0) >= 8);
        if (filters.recent === true) items = items.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = items.length;
        const start = (page - 1) * pageSize;
        const paged = items.slice(start, start + pageSize);

        return { items: paged, page, pageSize, total, hasMore: start + pageSize < total };
      },

      async createItem(id, payload) {
        const key = KEY_ITEMS(id);
        const items = readJSON(key, []);
        const item = { id: safeUUID(), createdAt: isoNow(), ...payload };
        items.unshift(item);
        writeJSON(key, items);
        return item;
      },

      async deleteItem(id, itemId) {
        const key = KEY_ITEMS(id);
        const items = readJSON(key, []);
        const next = items.filter((it) => it.id !== itemId);
        writeJSON(key, next);
        return { ok: true };
      },
    };
  }

  const api = localApi();

  /** ----------------------------- Create Event button ----------------------------- */
  function ensureCreateEventButton() {
    const actionsSection = qs("section.actions", main);
    if (!actionsSection) return null;

    let btn = qs('button[aria-label="Create event for this collection"]', actionsSection);
    if (btn) return btn;

    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--secondary btn--lg";
    btn.setAttribute("aria-label", "Create event for this collection");
    btn.innerHTML = `
      <svg aria-hidden="true" class="icon" role="img" viewBox="0 0 24 24">
        <path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2zm13 6H6v12h14V8z"></path>
      </svg>
      <span>Create Event</span>
    `;
    actionsSection.appendChild(btn);
    return btn;
  }

  /** ----------------------------- Add Item modal (local only) ----------------------------- */
  function modalCreateItem() {
    const form = document.createElement("form");
    form.setAttribute("novalidate", "true");

    form.innerHTML = `
      <div style="padding:20px 20px 0">
        <h2 id="dialog-title" style="font-size:18px;margin:0 0 8px">Add Item</h2>
        <p style="margin:0 0 10px;opacity:.85">Items are saved locally for now (until item DB is ready).</p>
      </div>
    `;

    const fields = {
      name: buildFormField({ label: "Name", name: "name", required: true }),
      importance: buildFormField({
        label: "Importance (1–10)",
        name: "importance",
        type: "number",
        required: true,
        attrs: { min: "1", max: "10", step: "1", inputmode: "numeric" },
      }),
      acquiredAt: buildFormField({ label: "Date of acquisition (optional)", name: "acquiredAt", type: "date" }),
      price: buildFormField({ label: "Price (optional)", name: "price", type: "number", attrs: { step: "0.01", min: "0" } }),
      description: buildTextAreaField({ label: "Description (optional)", name: "description", rows: 4 }),
    };

    const body = document.createElement("div");
    body.style.padding = "0 20px 10px";
    Object.values(fields).forEach((f) => body.appendChild(f.wrap));

    const footer = document.createElement("div");
    footer.style.cssText = "display:flex;gap:8px;justify-content:flex-end;padding:10px 20px 20px";
    footer.innerHTML = `
      <button type="button" class="btn btn--ghost" data-cmd="cancel">Cancel</button>
      <button type="submit" class="btn">Create</button>
    `;

    form.append(body, footer);
    const overlay = openModal(form, { labelledBy: "dialog-title" });

    on(form, "click", (e) => {
      const cmd = e.target.closest("[data-cmd]")?.dataset.cmd;
      if (cmd === "cancel") {
        e.preventDefault();
        closeModal(overlay);
      }
    });

    on(form, "submit", async (e) => {
      e.preventDefault();

      const name = fields.name.input.value.trim();
      const importance = fields.importance.input.value ? Number(fields.importance.input.value) : NaN;

      showFieldError(fields.name, "");
      showFieldError(fields.importance, "");

      let ok = true;
      if (!name) {
        showFieldError(fields.name, "Required");
        ok = false;
      }
      if (!Number.isFinite(importance) || importance < 1 || importance > 10) {
        showFieldError(fields.importance, "Must be between 1 and 10");
        ok = false;
      }
      if (!ok) return;

      await api.createItem(collectionId, {
        name,
        importance,
        acquiredAt: fields.acquiredAt.input.value || undefined,
        price: fields.price.input.value ? Number(fields.price.input.value) : undefined,
        description: fields.description.input.value.trim() || undefined,
      });

      closeModal(overlay);
      showToast("Item created (local).", "success");
      await reloadItems();
    });
  }

  /** ----------------------------- Data loading ----------------------------- */
  async function loadCollection() {
    // Collection loaded from DB API: collections_api.php?id=<id>
    const res = await fetch(`collections_api.php?id=${encodeURIComponent(collectionId)}`, { credentials: "same-origin" });
    const data = await res.json();

    if (!data.success || !data.collection) throw new Error(data.error || "Collection not found");

    const c = data.collection;

    const mapped = {
      id: String(c.collection_id),
      title: c.name || "My Collection",
      subtitle: c.description || "",
      coverImageUrl: c.image || heroImg?.src || "",
      type: c.type || "Collection",
      createdAt: c.creation_date ? new Date(c.creation_date).toISOString() : isoNow(),
      itemCount: typeof c.number_of_items === "number" ? c.number_of_items : 0,
      lastRecordAt: null,
    };

    // Optional local sync
    await api.syncCollection(mapped.id, mapped);

    state.collection = mapped;
    renderCollectionHeader(mapped);
    renderStats(mapped, mapped.itemCount);
  }

  async function loadItems({ append = false, page = 1 } = {}) {
    const res = await api.listItems(collectionId, {
      page,
      pageSize: state.pageSize,
      search: state.search,
      filters: state.filters,
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

  async function reloadItems() {
    state.page = 1;
    setViewMoreState(true);
    await loadItems({ append: false, page: 1 });
    renderStats(state.collection || {}, state.items.length);
  }

  /** ----------------------------- Navigation wiring ----------------------------- */
  function wireNavLinks() {
    const map = {
      collector: getMeta("collectors-page-path", "Homepage.login.html"),
      collections: buildCollectionsUrl(),
      events: buildEventsUrl(),
      community: getMeta("community-page-path", "Team_page2.html"),
    };

    Object.entries(map).forEach(([key, url]) => {
      const el = document.querySelector(`[data-nav="${key}"]`);
      if (!el) return;
      if (el.tagName === "A") el.setAttribute("href", url);
      el.addEventListener("click", (e) => {
        if (el.tagName !== "A") e.preventDefault();
        window.location.href = url;
      });
    });
  }

  /** ----------------------------- Events / actions wiring ----------------------------- */
  function attachEvents() {
    if (btnAddItem) on(btnAddItem, "click", modalCreateItem);

    // ✅ Create Event now redirects to event.html and auto-opens create there
    const btnCreateEvent = ensureCreateEventButton();
    if (btnCreateEvent) {
      on(btnCreateEvent, "click", (e) => {
        e.preventDefault();
        window.location.href = buildEventsUrl() + "&open=create";
      });
    }

    if (viewMoreBtn) on(viewMoreBtn, "click", async () => loadItems({ append: true, page: state.page + 1 }));

    if (searchInput) {
      on(
        searchInput,
        "input",
        debounce(async () => {
          state.search = searchInput.value.trim();
          await reloadItems();
        }, 250)
      );
    }

    if (filterSelect) {
      on(filterSelect, "change", async () => {
        const v = filterSelect.value || "";
        const filters = {};
        if (v.startsWith("type:")) filters.type = v.split(":")[1];
        else if (v === "rarity:high") filters.rarity = "high";
        else if (v === "recent") filters.recent = true;
        state.filters = filters;
        await reloadItems();
      });
    }

    // Delete item (local)
    if (grid) {
      on(grid, "click", ".card__action--delete", async (e, btn) => {
        e.preventDefault();
        e.stopPropagation();

        const card = btn.closest(".card");
        if (!card) return;

        const id = card.dataset.itemId;
        const name = qs(".card__title", card)?.textContent?.trim() || "item";

        const ok = await confirmDialog({
          title: "Delete item",
          message: `Are you sure you want to delete "${name}"?`,
          confirmText: "Delete",
          cancelText: "Cancel",
        });
        if (!ok) return;

        await api.deleteItem(collectionId, id);
        card.remove();
        showToast("Item deleted (local).", "success");
        await reloadItems();
      });

      // Navigate to item page
      on(grid, "click", ".card__media, .card__title a, .card", (e, el) => {
        if (e.target.closest(".card__action--delete")) return;
        const card = el.closest(".card");
        const href = el.getAttribute("data-href") || qs(".card__title a", card)?.getAttribute("href");
        if (href) {
          if (e.metaKey || e.ctrlKey) return;
          e.preventDefault();
          window.location.href = href;
        }
      });

      on(grid, "keydown", (e) => {
        if (e.key !== "Enter") return;
        const card = e.target.closest(".card");
        if (!card) return;
        const href = qs(".card__title a", card)?.getAttribute("href");
        if (href) {
          e.preventDefault();
          window.location.href = href;
        }
      });
    }
  }

  /** ----------------------------- Init ----------------------------- */
  async function init() {
    try {
      wireNavLinks();
      await loadCollection();
      await loadItems({ append: false, page: 1 });
      attachEvents();
      showToast("Collection ready.", "success", 1400);
    } catch (err) {
      console.error(err);
      showToast("Could not load collection.", "error", 4000);
    }
  }

  document.readyState !== "loading" ? init() : document.addEventListener("DOMContentLoaded", init);
})();
