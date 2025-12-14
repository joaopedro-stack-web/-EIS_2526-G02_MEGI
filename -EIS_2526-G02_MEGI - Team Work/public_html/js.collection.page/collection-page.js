(() => {
  "use strict";

  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  const BUILD_TAG = "COLLECTION-JS v11 (manage + stats live + remove + search/filter)";

  // ===================== Toast =====================
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
    }, 3200);
  }

  // ===================== Helpers =====================
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

  function safeText(v) { return v == null ? "" : String(v); }

  function fmtDateHuman(iso) {
    if (!iso) return "-";
    // aceita "YYYY-MM-DD" ou datetime
    const d = new Date(String(iso).slice(0, 10));
    if (Number.isNaN(d.getTime())) return String(iso);
    // "Jan 12, 2023"
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
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

  // ===================== Endpoints =====================
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

  // ===================== State =====================
  let CURRENT_COLLECTION = null;
  let ALL_ITEMS = [];
  let VIEW_ITEMS = [];
  let AUTO_REFRESH_TIMER = null;

  // ===================== HERO =====================
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

  // ===================== STATS (Collection Data) =====================
  function setStatsRow(labelIncludesLower, value) {
    const rows = qsa(".stats__row");
    for (const r of rows) {
      const dt = r.querySelector("dt");
      const dd = r.querySelector("dd");
      if (!dt || !dd) continue;
      const t = (dt.textContent || "").trim().toLowerCase();
      if (t.includes(labelIncludesLower)) {
        dd.textContent = value;
        return true;
      }
    }
    return false;
  }

  function computeLastRecord(items) {
    // tenta usar a data mais recente entre acquisition_date/date_of_acquisition/created_at/updated_at
    let best = "";
    const keys = ["date_of_acquisition", "acquisition_date", "created_at", "updated_at", "date"];
    for (const it of items || []) {
      for (const k of keys) {
        const v = it?.[k];
        if (!v) continue;
        const iso = String(v).slice(0, 10);
        if (!best || iso > best) best = iso;
      }
    }
    return best ? fmtDateHuman(best) : "-";
  }

  function updateStatsUI(collection, items) {
    const created = fmtDateHuman(collection?.creation_date || "");
    const type = collection?.type ? String(collection.type) : "-";
    const count = String((items || []).length);
    const lastRecord = computeLastRecord(items);

    setStatsRow("created", created);
    setStatsRow("type", type);
    setStatsRow("number of items", count);
    setStatsRow("last record", lastRecord);
  }

  // ===================== CARDS (with remove button) =====================
  function buildItemCard(it, collectionId) {
    const id = it.item_id ?? it.id ?? it.uuid ?? it.itemId ?? "";
    const name = it.name || "Item";
    const href = `index.html?id=${encodeURIComponent(id)}&c=${encodeURIComponent(collectionId)}`;

    const card = document.createElement("article");
    card.className = "card";
    card.tabIndex = 0;
    card.dataset.itemId = String(id);

    // ✅ remove button injected but not changing layout
    card.innerHTML = `
      <div class="card__media" data-href="${href}" style="position:relative">
        <img alt="${safeText(name)}" src="${safeText(resolveAssetUrl(it.image || "images/default.jpg"))}"/>
        ${it.importance != null && safeText(it.importance) !== "" ? `<span class="badge" title="Importance ${safeText(it.importance)}">R${safeText(it.importance)}</span>` : ``}

        <!-- ✅ Remove button (small) -->
        <button type="button"
                class="__removeItemBtn"
                aria-label="Remove item"
                title="Remove item"
                style="
                  position:absolute; top:10px; right:10px;
                  width:34px; height:34px; border-radius:999px;
                  border:0; cursor:pointer;
                  background:rgba(0,0,0,.65); color:#fff;
                  display:flex; align-items:center; justify-content:center;
                ">
          ✕
        </button>
      </div>
      <div class="card__body">
        <h3 class="card__title"><a href="${href}">${safeText(name)}</a></h3>
        <p class="card__meta">${safeText(it.description || "")}</p>
      </div>
    `;

    // open item
    card.querySelector(".card__media")?.addEventListener("click", (e) => {
      if (e.target.closest("button.__removeItemBtn")) return;
      location.href = href;
    });
    card.addEventListener("keydown", (e) => { if (e.key === "Enter") location.href = href; });

    // remove item
    const rm = card.querySelector("button.__removeItemBtn");
    if (rm) {
      rm.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!id) return toast("Missing item id.", "error");
        const ok = confirm("Remove this item?");
        if (!ok) return;

        try {
          const endpoint = await detectItemsEndpoint();
          const fd = new FormData();
          fd.append("action", "delete");
          // compat: alguns backends usam item_id ou id
          fd.append("item_id", String(id));
          fd.append("id", String(id));

          await apiPostJson(endpoint, fd);

          toast("Item removed.", "success");
          await refreshAll(); // reload collection + items + stats
        } catch (err) {
          console.error(err);
          toast("Could not remove item:\n" + (err.message || err), "error");
        }
      });
    }

    return card;
  }

  function renderGrid(items) {
    const grid = qs("[data-grid]") || qs(".grid");
    if (!grid) return;

    grid.innerHTML = "";
    for (const it of items) grid.appendChild(buildItemCard(it, getCollectionId()));
  }

  // ===================== Search & Filter =====================
  function applySearchAndFilter() {
    const q = (qs("#search-input")?.value || "").trim().toLowerCase();
    const f = (qs("#filter-select")?.value || "").trim().toLowerCase();

    let out = [...ALL_ITEMS];

    // search by name/description
    if (q) {
      out = out.filter(it => {
        const name = safeText(it.name).toLowerCase();
        const desc = safeText(it.description).toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    // filter options
    if (f) {
      if (f === "recent") {
        // recentemente adicionado: maior item_id primeiro (fallback)
        out.sort((a, b) => String(b.item_id ?? b.id ?? "").localeCompare(String(a.item_id ?? a.id ?? "")));
      } else if (f.startsWith("rarity:")) {
        // rarity:high => importance 8-10
        if (f.includes("high")) {
          out = out.filter(it => {
            const imp = Number(it.importance ?? it.rarity ?? NaN);
            return Number.isFinite(imp) && imp >= 8 && imp <= 10;
          });
        }
      } else if (f.startsWith("type:")) {
        // seu item não tem "type" no banco pelo que você mostrou,
        // mas se tiver "type" ou a descrição incluir, filtra.
        const target = f.split(":")[1] || "";
        out = out.filter(it => {
          const t = safeText(it.type).toLowerCase();
          const desc = safeText(it.description).toLowerCase();
          return t.includes(target) || desc.includes(target);
        });
      }
    }

    VIEW_ITEMS = out;
    renderGrid(VIEW_ITEMS);

    // stats count deve refletir items reais (não filtrados) ou filtrados?
    // Você pediu "Number of Items" real da coleção -> usa ALL_ITEMS sempre:
    updateStatsUI(CURRENT_COLLECTION, ALL_ITEMS);
  }

  function wireSearchAndFilter() {
    const search = qs("#search-input");
    const filter = qs("#filter-select");
    if (search) search.addEventListener("input", applySearchAndFilter);
    if (filter) filter.addEventListener("change", applySearchAndFilter);
  }

  // ===================== Load collection + items =====================
  async function loadCollectionAndItems() {
    const collectionId = getCollectionId();
    if (!collectionId) throw new Error("Sem collection id (?c= ou ?id=).");

    const main = qs("#main-content");
    if (main && !main.dataset.collectionId) main.dataset.collectionId = collectionId;

    const colEndpoint = await detectCollectionsEndpoint();
    const itemsEndpoint = await detectItemsEndpoint();

    const colJson = await apiGetJson(`${colEndpoint}?id=${encodeURIComponent(collectionId)}&t=${Date.now()}`);
    CURRENT_COLLECTION = colJson.collection || colJson.data || {};
    setHeroFromCollection(CURRENT_COLLECTION);

    const itemsJson = await apiGetJson(`${itemsEndpoint}?collection_id=${encodeURIComponent(collectionId)}&t=${Date.now()}`);
    ALL_ITEMS = Array.isArray(itemsJson.items) ? itemsJson.items : (Array.isArray(itemsJson.data) ? itemsJson.data : []);
    VIEW_ITEMS = [...ALL_ITEMS];

    // render with filters applied
    applySearchAndFilter();

    // stats (real-time snapshot)
    updateStatsUI(CURRENT_COLLECTION, ALL_ITEMS);
  }

  async function refreshAll() {
    await loadCollectionAndItems();
  }

  // ===================== Manage Collection Modal =====================
  function ensureManageCollectionModal() {
    let modal = qs("#__manage_collection_modal");
    if (modal) return modal;

    modal = document.createElement("dialog");
    modal.id = "__manage_collection_modal";
    modal.setAttribute("aria-label", "Manage Collection");
    Object.assign(modal.style, {
      width: "min(620px, 92vw)",
      border: "1px solid rgba(0,0,0,.15)",
      borderRadius: "16px",
      padding: "0",
    });

    modal.innerHTML = `
      <form id="__mc_form" method="dialog" style="padding:18px 18px 16px">
        <h3 style="margin:0 0 14px">Manage Collection</h3>

        <div style="display:grid; gap:10px">
          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Name *</span>
            <input id="__mc_name" required type="text" style="padding:10px;border:1px solid #ddd;border-radius:10px">
          </label>

          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Type</span>
            <input id="__mc_type" type="text" style="padding:10px;border:1px solid #ddd;border-radius:10px">
          </label>

          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Creation date</span>
            <input id="__mc_date" type="date" style="padding:10px;border:1px solid #ddd;border-radius:10px">
          </label>

          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Description</span>
            <textarea id="__mc_desc" rows="3" style="padding:10px;border:1px solid #ddd;border-radius:10px;resize:vertical"></textarea>
          </label>

          <label style="display:grid; gap:6px">
            <span style="font-weight:600">Banner image (optional)</span>
            <input id="__mc_image" type="file" accept="image/*"
              style="padding:10px;border:1px solid #ddd;border-radius:10px;background:#fff">
          </label>

          <div id="__mc_preview_wrap" style="display:none;margin-top:4px">
            <img id="__mc_preview" alt="Preview" style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;border:1px solid #ddd">
          </div>

          <p id="__mc_error" style="margin:6px 0 0;color:#B00020;font-weight:600"></p>
        </div>

        <div style="display:flex; gap:10px; justify-content:space-between; align-items:center; margin-top:14px">
          <button type="button" id="__mc_delete"
            style="padding:10px 14px;border-radius:10px;border:1px solid #B00020;background:#fff;color:#B00020;cursor:pointer">
            Delete Collection
          </button>

          <div style="display:flex; gap:10px; justify-content:flex-end">
            <button type="button" id="__mc_cancel"
              style="padding:10px 14px;border-radius:10px;border:1px solid #ddd;background:#fff;cursor:pointer">
              Cancel
            </button>
            <button type="submit" id="__mc_save"
              style="padding:10px 14px;border-radius:10px;border:0;background:#111;color:#fff;cursor:pointer">
              Save
            </button>
          </div>
        </div>
      </form>
    `;

    document.body.appendChild(modal);

    // preview
    const file = qs("#__mc_image", modal);
    const prevWrap = qs("#__mc_preview_wrap", modal);
    const prevImg = qs("#__mc_preview", modal);

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

    // cancel
    qs("#__mc_cancel", modal).addEventListener("click", () => modal.close());

    // delete collection (calls collection_api.php action delete)
    qs("#__mc_delete", modal).addEventListener("click", async () => {
      const collectionId = getCollectionId();
      const ok = confirm("Delete this collection? This cannot be undone.");
      if (!ok) return;

      try {
        const endpoint = await detectCollectionsEndpoint();
        const fd = new FormData();
        fd.append("action", "delete");
        fd.append("collection_id", String(collectionId));
        await apiPostJson(endpoint, fd);

        toast("Collection deleted.", "success");
        modal.close();
        // back to collections page
        location.href = "Homepage.login.html";
      } catch (err) {
        console.error(err);
        toast("Could not delete collection:\n" + (err.message || err), "error");
      }
    });

    // save update
    qs("#__mc_form", modal).addEventListener("submit", async (e) => {
      e.preventDefault();

      const collectionId = getCollectionId();
      const errEl = qs("#__mc_error", modal);
      errEl.textContent = "";

      const name = (qs("#__mc_name", modal).value || "").trim();
      if (!name) return (errEl.textContent = "Name is required.");

      try {
        const endpoint = await detectCollectionsEndpoint();
        const fd = new FormData();
        fd.append("action", "update");
        fd.append("collection_id", String(collectionId));
        fd.append("name", name);

        const type = (qs("#__mc_type", modal).value || "").trim();
        const date = (qs("#__mc_date", modal).value || "").trim();
        const desc = (qs("#__mc_desc", modal).value || "").trim();

        if (type !== "") fd.append("type", type);
        if (date !== "") fd.append("creation_date", date);
        if (desc !== "") fd.append("description", desc);

        const img = qs("#__mc_image", modal);
        if (img && img.files && img.files[0]) fd.append("image", img.files[0]);

        await apiPostJson(endpoint, fd);

        modal.close();
        toast("Collection updated.", "success");
        await refreshAll();
      } catch (err) {
        console.error(err);
        errEl.textContent = String(err.message || err);
      }
    });

    return modal;
  }

  function openManageCollectionModal() {
    const collectionId = getCollectionId();
    if (!collectionId) return toast("Sem collection id (?c=).", "error");

    const modal = ensureManageCollectionModal();

    // prefill with CURRENT_COLLECTION
    const c = CURRENT_COLLECTION || {};
    qs("#__mc_name", modal).value = c.name || "";
    qs("#__mc_type", modal).value = c.type || "";
    qs("#__mc_date", modal).value = (c.creation_date || "").slice(0, 10);
    qs("#__mc_desc", modal).value = c.description || "";

    // reset preview/file
    const file = qs("#__mc_image", modal);
    if (file) file.value = "";

    const prevWrap = qs("#__mc_preview_wrap", modal);
    const prevImg = qs("#__mc_preview", modal);

    const heroSrc = resolveAssetUrl(c.image || "");
    if (heroSrc) {
      prevImg.src = heroSrc;
      prevWrap.style.display = "block";
    } else {
      prevWrap.style.display = "none";
      prevImg.removeAttribute("src");
    }

    if (typeof modal.showModal === "function") modal.showModal();
    else toast("Seu browser não suporta <dialog>.", "error");
  }

  // ===================== Item Create Modal (mantido do v10) =====================
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

  // ===================== Event Create Modal (mantido) =====================
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

  // ===================== Buttons wiring =====================
  function wireButtons() {
    // Add Item
    const addItemBtn = qs("#addItemBtn");
    if (addItemBtn) {
      addItemBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openCreateItemModal();
      });
    }

    // Manage Collection
    const manageBtn = qs("#manageCollectionBtn");
    if (manageBtn) {
      manageBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openManageCollectionModal();
      });
    }

    // Create Event (append once, like your v10)
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

  // ===================== Auto refresh (real time-ish) =====================
  function startAutoRefresh() {
    stopAutoRefresh();
    // “em tempo real” via polling leve
    AUTO_REFRESH_TIMER = setInterval(async () => {
      try {
        await refreshAll();
      } catch (e) {
        // não spamma toast
        console.warn("[auto-refresh] failed", e);
      }
    }, 12000); // 12s
  }

  function stopAutoRefresh() {
    if (AUTO_REFRESH_TIMER) clearInterval(AUTO_REFRESH_TIMER);
    AUTO_REFRESH_TIMER = null;
  }

  // ===================== Init =====================
  document.addEventListener("DOMContentLoaded", async () => {
    // opcional: debug
    // toast(`✅ ${BUILD_TAG} carregado`, "success");

    wireButtons();
    wireSearchAndFilter();

    try {
      await loadCollectionAndItems();
      startAutoRefresh();
    } catch (e) {
      console.error(e);
      toast("Erro ao carregar:\n" + (e.message || e), "error");
    }
  });

})();
