(() => {
  "use strict";

  const qs = (s, el = document) => el.querySelector(s);

  const BUILD_TAG = "COLLECTION-JS v10 (item modal + event modal + banner fix)";
  document.addEventListener("DOMContentLoaded", () => toast(`✅ ${BUILD_TAG} carregado`, "success"));

  function toast(msg, type = "info") {
    let root = qs("#__toast");
    if (!root) {
      root = document.createElement("div");
      root.id = "__toast";
      Object.assign(root.style, {
        position: "fixed",
        right: "16px",
        bottom: "16px",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      });
      document.body.appendChild(root);
    }
    const el = document.createElement("div");
    el.textContent = msg;
    Object.assign(el.style, {
      background: type === "error" ? "#B00020" : type === "success" ? "#0B8A83" : "#111",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: "10px",
      boxShadow: "0 8px 24px rgba(0,0,0,.25)",
      fontSize: "14px",
      maxWidth: "520px",
      whiteSpace: "pre-wrap",
    });
    root.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      el.style.transition = "all .25s ease";
      setTimeout(() => el.remove(), 250);
    }, 4200);
  }

  function getMeta(name, fallback = "") {
    return (document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? fallback).toString();
  }

  function resolveAssetUrl(path) {
    const p = String(path || "").trim();
    if (!p) return "";
    if (/^(https?:\/\/|data:|blob:)/i.test(p)) return p;
    if (p.startsWith("/")) return p;

    const appBase = getMeta("app-base", "").replace(/\/+$/, "");
    if (appBase) return `${appBase}/${p.replace(/^\/+/, "")}`;

    const baseDir = location.href.replace(/[#?].*$/, "").replace(/\/[^\/]*$/, "/");
    return baseDir + p.replace(/^\/+/, "");
  }

  function getCollectionId() {
    const url = new URL(location.href);
    return (
      url.searchParams.get("c") ||
      url.searchParams.get("id") ||
      qs("#main-content")?.dataset?.collectionId ||
      ""
    );
  }

  async function fetchText(url, opts = {}) {
    const res = await fetch(url, { cache: "no-store", credentials: "same-origin", ...opts });
    const text = await res.text();
    return { res, text };
  }

  function tryParseJson(text) {
    try { return JSON.parse(text); } catch { return null; }
  }

  function pickSuccess(json) {
    if (!json) return false;
    return json.success === true || json.success === 1 || json.ok === true || json.status === "ok";
  }

  function extractError(json, text, res) {
    return json?.error || json?.message || `HTTP ${res.status}\n\n${text}`;
  }

  async function apiGetJson(url) {
    const { res, text } = await fetchText(url);
    const json = tryParseJson(text);
    if (!res.ok || !pickSuccess(json)) throw new Error(extractError(json, text, res));
    return json;
  }

  async function apiPostJson(url, fd) {
    const { res, text } = await fetchText(url, { method: "POST", body: fd });
    const json = tryParseJson(text);
    if (!res.ok || !pickSuccess(json)) throw new Error(extractError(json, text, res));
    return json;
  }

  // --------- Endpoints ----------
  let ITEMS_ENDPOINT = null;
  async function detectItemsEndpoint() {
    if (ITEMS_ENDPOINT) return ITEMS_ENDPOINT;
    const candidates = ["items_api.php", "Item_api.php", "item_api.php", "./items_api.php", "./Item_api.php"];
    for (const c of candidates) {
      try {
        const { res, text } = await fetchText(`${c}?__probe=1&t=${Date.now()}`);
        if (res.status !== 404 && text && text.trim().length > 0) {
          ITEMS_ENDPOINT = c;
          return ITEMS_ENDPOINT;
        }
      } catch (_) {}
    }
    ITEMS_ENDPOINT = "items_api.php";
    return ITEMS_ENDPOINT;
  }

  let EVENTS_ENDPOINT = null;
  async function detectEventsEndpoint() {
    if (EVENTS_ENDPOINT) return EVENTS_ENDPOINT;
    const candidates = ["events_api.php", "Events_api.php", "event_api.php", "./events_api.php"];
    for (const c of candidates) {
      try {
        const { res, text } = await fetchText(`${c}?__probe=1&t=${Date.now()}`);
        if (res.status !== 404 && text && text.trim().length > 0) {
          EVENTS_ENDPOINT = c;
          return EVENTS_ENDPOINT;
        }
      } catch (_) {}
    }
    EVENTS_ENDPOINT = "events_api.php";
    return EVENTS_ENDPOINT;
  }

  let COLLECTIONS_ENDPOINT = null;
  async function detectCollectionsEndpoint() {
    if (COLLECTIONS_ENDPOINT) return COLLECTIONS_ENDPOINT;
    const candidates = ["collection_api.php", "collections_api.php", "./collection_api.php", "./collections_api.php"];
    for (const c of candidates) {
      try {
        const { res, text } = await fetchText(`${c}?__probe=1&t=${Date.now()}`);
        if (res.status !== 404 && text && text.trim().length > 0) {
          COLLECTIONS_ENDPOINT = c;
          return COLLECTIONS_ENDPOINT;
        }
      } catch (_) {}
    }
    COLLECTIONS_ENDPOINT = "collection_api.php";
    return COLLECTIONS_ENDPOINT;
  }

  // --------- HERO ----------
  function setHeroFromCollection(c) {
    const heroImg = qs(".hero__media img");
    if (heroImg) {
      const src = resolveAssetUrl(c.image || heroImg.getAttribute("src") || "");
      if (src) heroImg.src = src;
      heroImg.alt = `${c.name || "Collection"} cover image`;
    }

    const title = qs(".hero__title");
    if (title) title.textContent = c.name || "Collection";

    const subtitle = qs(".hero__subtitle");
    if (subtitle) {
      const parts = [];
      if (c.type) parts.push(c.type);
      if (c.creation_date) parts.push(c.creation_date);
      subtitle.textContent = parts.length ? parts.join(" · ") : (c.description || "");
    }
  }

  // --------- CARDS ----------
  function safeText(v) { return v == null ? "" : String(v); }

  function buildItemCard(it, collectionId) {
    const id = it.item_id ?? it.id ?? it.uuid ?? it.itemId ?? "";
    const name = it.name || "Item";
    const href = `index.html?id=${encodeURIComponent(id)}&c=${encodeURIComponent(collectionId)}`;

    const card = document.createElement("article");
    card.className = "card";
    card.tabIndex = 0;

    card.innerHTML = `
      <div class="card__media" data-href="${href}">
        <img alt="${safeText(name)}" src="${safeText(resolveAssetUrl(it.image || "images/default.jpg"))}"/>
        ${it.importance != null && safeText(it.importance) !== "" ? `<span class="badge">R${safeText(it.importance)}</span>` : ``}
      </div>
      <div class="card__body">
        <h3 class="card__title"><a href="${href}">${safeText(name)}</a></h3>
        <p class="card__meta">${safeText(it.description || "")}</p>
      </div>
    `;

    card.querySelector(".card__media")?.addEventListener("click", () => (location.href = href));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter") location.href = href; });

    return card;
  }

  async function loadCollectionAndItems() {
    const collectionId = getCollectionId();
    if (!collectionId) return toast("Sem collection id (?c=).", "error");

    const main = qs("#main-content");
    if (main && !main.dataset.collectionId) main.dataset.collectionId = collectionId;

    const colEndpoint = await detectCollectionsEndpoint();
    const itemsEndpoint = await detectItemsEndpoint();

    const colJson = await apiGetJson(`${colEndpoint}?id=${encodeURIComponent(collectionId)}&t=${Date.now()}`);
    setHeroFromCollection(colJson.collection || colJson.data || {});

    const itemsJson = await apiGetJson(`${itemsEndpoint}?collection_id=${encodeURIComponent(collectionId)}&t=${Date.now()}`);
    const items = Array.isArray(itemsJson.items) ? itemsJson.items : (Array.isArray(itemsJson.data) ? itemsJson.data : []);

    const grid = qs("[data-grid]") || qs(".grid");
    if (grid) {
      grid.innerHTML = "";
      items.forEach((it) => grid.appendChild(buildItemCard(it, collectionId)));
    }
  }

  // --------- ITEM CREATE MODAL (REPOSTO) ----------
  function ensureCreateItemModal() {
    let modal = qs("#__create_item_modal");
    if (modal) return modal;

    modal = document.createElement("dialog");
    modal.id = "__create_item_modal";
    modal.setAttribute("aria-label", "Create Item");
    Object.assign(modal.style, {
      width: "min(560px, 92vw)",
      border: "1px solid rgba(0,0,0,.15)",
      borderRadius: "16px",
      padding: "0",
    });

    modal.innerHTML = `
      <form method="dialog" id="__create_item_form" style="padding:18px 18px 16px">
        <h3 style="margin:0 0 14px">Create new Item</h3>

        <div style="display:grid; gap:10px">
          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Name *</span>
            <input id="__ci_name" required type="text" style="padding:10px;border:1px solid #ddd;border-radius:10px">
          </label>

          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Importance (0–10) *</span>
            <input id="__ci_importance" required type="number" min="0" max="10" style="padding:10px;border:1px solid #ddd;border-radius:10px">
          </label>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
            <label style="display:grid; gap:6px">
              <span style="font-weight:600">Weight (g)</span>
              <input id="__ci_weight" type="number" step="0.01" style="padding:10px;border:1px solid #ddd;border-radius:10px">
            </label>

            <label style="display:grid; gap:6px">
              <span style="font-weight:600">Price (€)</span>
              <input id="__ci_price" type="number" step="0.01" style="padding:10px;border:1px solid #ddd;border-radius:10px">
            </label>
          </div>

          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Date of Acquisition</span>
            <input id="__ci_date" type="date" style="padding:10px;border:1px solid #ddd;border-radius:10px">
          </label>

          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Description</span>
            <textarea id="__ci_desc" rows="3" style="padding:10px;border:1px solid #ddd;border-radius:10px;resize:vertical"></textarea>
          </label>

          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Image (optional)</span>
            <input id="__ci_image" type="file" accept="image/*"
              style="padding:10px;border:1px solid #ddd;border-radius:10px;background:#fff">
          </label>

          <div id="__ci_preview_wrap" style="display:none;margin-top:4px">
            <img id="__ci_preview" alt="Preview" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;border:1px solid #ddd">
          </div>

          <p id="__ci_error" style="margin:6px 0 0;color:#B00020;font-weight:600"></p>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:14px">
          <button type="button" id="__ci_cancel" style="padding:10px 14px;border-radius:10px;border:1px solid #ddd;background:#fff;cursor:pointer">Cancel</button>
          <button type="submit" id="__ci_save" style="padding:10px 14px;border-radius:10px;border:0;background:#111;color:#fff;cursor:pointer">Create</button>
        </div>
      </form>
    `;
    document.body.appendChild(modal);

    const file = qs("#__ci_image", modal);
    const prevWrap = qs("#__ci_preview_wrap", modal);
    const prevImg = qs("#__ci_preview", modal);

    file.addEventListener("change", () => {
      const f = file.files && file.files[0];
      if (!f) {
        prevWrap.style.display = "none";
        prevImg.removeAttribute("src");
        return;
      }
      prevImg.src = URL.createObjectURL(f);
      prevWrap.style.display = "block";
    });

    qs("#__ci_cancel", modal).addEventListener("click", () => modal.close());

    qs("#__create_item_form", modal).addEventListener("submit", async (e) => {
      e.preventDefault();

      const collectionId = getCollectionId();
      const errEl = qs("#__ci_error", modal);
      errEl.textContent = "";

      const name = (qs("#__ci_name", modal).value || "").trim();
      const imp = (qs("#__ci_importance", modal).value || "").trim();
      const weight = (qs("#__ci_weight", modal).value || "").trim();
      const price = (qs("#__ci_price", modal).value || "").trim();
      const date = (qs("#__ci_date", modal).value || "").trim();
      const desc = (qs("#__ci_desc", modal).value || "").trim();

      if (!name) return (errEl.textContent = "Name is required.");
      if (imp === "") return (errEl.textContent = "Importance is required.");

      try {
        const endpoint = await detectItemsEndpoint();

        const fd = new FormData();
        fd.append("action", "create");
        fd.append("collection_id", collectionId);
        fd.append("name", name);
        fd.append("importance", imp);

        if (weight !== "") fd.append("weight", weight);
        if (price !== "") fd.append("price", price);
        if (date !== "") {
          fd.append("date_of_acquisition", date);
          fd.append("acquisition_date", date);
        }
        if (desc !== "") fd.append("description", desc);

        const img = qs("#__ci_image", modal);
        if (img && img.files && img.files[0]) fd.append("image", img.files[0]);

        const created = await apiPostJson(endpoint, fd);

        const newId =
          created.item_id ?? created.id ?? created.uuid ?? created.itemId ??
          created.item?.item_id ?? created.item?.id ?? created.item?.uuid ?? "";

        if (!newId) throw new Error("A API não retornou item_id/id/uuid.");

        modal.close();
        toast("Item criado. Abrindo item...", "success");
        location.href = `index.html?id=${encodeURIComponent(newId)}&c=${encodeURIComponent(collectionId)}`;

      } catch (err) {
        console.error(err);
        errEl.textContent = String(err.message || err);
      }
    });

    return modal;
  }

  function openCreateItemModal() {
    const collectionId = getCollectionId();
    if (!collectionId) return toast("Sem collection id (?c=).", "error");
    const modal = ensureCreateItemModal();
    if (typeof modal.showModal === "function") modal.showModal();
    else toast("Seu browser não suporta <dialog>.", "error");
  }

  // --------- EVENT CREATE MODAL (mantido) ----------
  function ensureCreateEventModal() {
    let modal = qs("#__create_event_modal");
    if (modal) return modal;

    modal = document.createElement("dialog");
    modal.id = "__create_event_modal";
    modal.setAttribute("aria-label", "Create Event");
    Object.assign(modal.style, {
      width: "min(560px, 92vw)",
      border: "1px solid rgba(0,0,0,.15)",
      borderRadius: "16px",
      padding: "0",
    });

    modal.innerHTML = `
      <form method="dialog" id="__create_event_form" style="padding:18px 18px 16px">
        <h3 style="margin:0 0 14px">Create new Event</h3>

        <div style="display:grid; gap:10px">
          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Name *</span>
            <input id="__ce_name" required type="text" style="padding:10px;border:1px solid #ddd;border-radius:10px">
          </label>

          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Location *</span>
            <input id="__ce_location" required type="text" style="padding:10px;border:1px solid #ddd;border-radius:10px">
          </label>

          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Date *</span>
            <input id="__ce_date" required type="date" style="padding:10px;border:1px solid #ddd;border-radius:10px">
          </label>

          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Description</span>
            <textarea id="__ce_desc" rows="3" style="padding:10px;border:1px solid #ddd;border-radius:10px;resize:vertical"></textarea>
          </label>

          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Image (optional)</span>
            <input id="__ce_image" type="file" accept="image/*"
              style="padding:10px;border:1px solid #ddd;border-radius:10px;background:#fff">
          </label>

          <div id="__ce_preview_wrap" style="display:none;margin-top:4px">
            <img id="__ce_preview" alt="Preview" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;border:1px solid #ddd">
          </div>

          <p id="__ce_error" style="margin:6px 0 0;color:#B00020;font-weight:600"></p>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:14px">
          <button type="button" id="__ce_cancel" style="padding:10px 14px;border-radius:10px;border:1px solid #ddd;background:#fff;cursor:pointer">Cancel</button>
          <button type="submit" id="__ce_save" style="padding:10px 14px;border-radius:10px;border:0;background:#111;color:#fff;cursor:pointer">Create</button>
        </div>
      </form>
    `;
    document.body.appendChild(modal);

    const file = qs("#__ce_image", modal);
    const prevWrap = qs("#__ce_preview_wrap", modal);
    const prevImg = qs("#__ce_preview", modal);

    file.addEventListener("change", () => {
      const f = file.files && file.files[0];
      if (!f) {
        prevWrap.style.display = "none";
        prevImg.removeAttribute("src");
        return;
      }
      prevImg.src = URL.createObjectURL(f);
      prevWrap.style.display = "block";
    });

    qs("#__ce_cancel", modal).addEventListener("click", () => modal.close());

    qs("#__create_event_form", modal).addEventListener("submit", async (e) => {
      e.preventDefault();

      const collectionId = getCollectionId();
      const errEl = qs("#__ce_error", modal);
      errEl.textContent = "";

      const name = (qs("#__ce_name", modal).value || "").trim();
      const location = (qs("#__ce_location", modal).value || "").trim();
      const date = (qs("#__ce_date", modal).value || "").trim();
      const desc = (qs("#__ce_desc", modal).value || "").trim();

      if (!name) return (errEl.textContent = "Name is required.");
      if (!location) return (errEl.textContent = "Location is required.");
      if (!date) return (errEl.textContent = "Date is required.");

      try {
        const endpoint = await detectEventsEndpoint();

        const fd = new FormData();
        fd.append("action", "create");
        // compat
        fd.append("collection", collectionId);
        fd.append("collection_id", collectionId);

        fd.append("name", name);
        fd.append("location", location);
        fd.append("date", date);
        fd.append("description", desc);

        const img = qs("#__ce_image", modal);
        if (img && img.files && img.files[0]) fd.append("image", img.files[0]);

        await apiPostJson(endpoint, fd);

        modal.close();
        toast("Evento criado e ligado à coleção. Abrindo Events...", "success");
        location.href = `event.html?c=${encodeURIComponent(collectionId)}`;

      } catch (err) {
        console.error(err);
        errEl.textContent = String(err.message || err);
      }
    });

    return modal;
  }

  function openCreateEventModal() {
    const collectionId = getCollectionId();
    if (!collectionId) return toast("Sem collection id (?c=).", "error");
    const modal = ensureCreateEventModal();
    if (typeof modal.showModal === "function") modal.showModal();
    else toast("Seu browser não suporta <dialog>.", "error");
  }

  // --------- Buttons wiring ----------
  function wireButtons() {
    const addItemBtn = qs("#addItemBtn");
    if (addItemBtn) {
      addItemBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openCreateItemModal();
      });
    }

    const actions = qs(".actions");
    if (actions && !qs("#__createEventBtn")) {
      const btn = document.createElement("button");
      btn.id = "__createEventBtn";
      btn.type = "button";
      btn.className = "btn btn--secondary btn--lg";
      btn.setAttribute("aria-label", "Create a new event for this collection");
      btn.innerHTML = `<span>Create Event</span>`;
      btn.addEventListener("click", openCreateEventModal);
      actions.appendChild(btn);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireButtons();
    loadCollectionAndItems().catch((e) => {
      console.error(e);
      toast("Erro ao carregar:\n" + (e.message || e), "error");
    });
  });
})();
