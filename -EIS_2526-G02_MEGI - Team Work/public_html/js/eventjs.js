(() => {
  "use strict";

  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  function toast(msg, type = "info") {
    let root = qs("#__toast_event");
    if (!root) {
      root = document.createElement("div");
      root.id = "__toast_event";
      Object.assign(root.style, {
        position: "fixed",
        right: "16px",
        bottom: "16px",
        zIndex: 999999,
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

  function getParams() {
    const u = new URL(location.href);
    return {
      collectionId: u.searchParams.get("c") || "",
      open: u.searchParams.get("open") || "",
    };
  }

  const params = getParams();

  // Elements (do seu HTML original)
  const listEl = qs("#event-list");
  const btnNew = qs("#new-event");

  const dialog = qs("#event-dialog");
  const form = qs("#event-form");
  const formTitle = qs("#form-title");
  const formErr = qs("#form-error");

  const selCollection = qs("#form-collection");
  const inpName = qs("#form-name");
  const inpLoc = qs("#form-location");
  const inpDate = qs("#form-date");
  const inpDesc = qs("#form-desc");
  const inpImg = qs("#form-image");

  const btnCancel = qs("#cancel");

  const detailDialog = qs("#detail-dialog");
  const detailTitle = qs("#detail-title");
  const detailDesc = qs("#detail-desc");
  const detailImage = qs("#detail-image");
  const detailCollection = qs("#detail-collection");
  const detailDate = qs("#detail-date");
  const detailLocation = qs("#detail-location");
  const detailRating = qs("#detail-rating");
  const detailClose = qs("#detail-close");

  const filterComing = qs("#coming");
  const filterPast = qs("#past");
  const filterAll = qs("#all");

  const tpl = qs("#events");

  const EVENTS_ENDPOINT = "events_api.php";
  const COLLECTIONS_ENDPOINT = "collection_api.php";

  let mode = "create";
  let editingId = null;
  let currentFilter = "all";
  let cached = [];

  function normalizeEvent(apiEv) {
    return {
      event_id: apiEv.event_id ?? apiEv.id ?? null,
      collection_id: apiEv.collection_id ?? apiEv.collection ?? "",
      name: apiEv.name ?? "",
      location: apiEv.location ?? "",
      date: apiEv.date ?? "",
      description: apiEv.description ?? "",
      rating: apiEv.rating ?? "",
      image: apiEv.image ?? null,
    };
  }

  function resetForm() {
    formErr.textContent = "";
    inpName.value = "";
    inpLoc.value = "";
    inpDate.value = "";
    inpDesc.value = "";
    if (inpImg) inpImg.value = "";
    mode = "create";
    editingId = null;
    formTitle.textContent = "New event";
  }

  function openCreate() {
    resetForm();
    if (params.collectionId && selCollection) {
      selCollection.value = params.collectionId;
      selCollection.disabled = true;
    } else if (selCollection) {
      selCollection.disabled = false;
    }
    dialog.showModal();
  }

  function openEdit(ev) {
    resetForm();
    mode = "edit";
    editingId = ev.event_id;
    formTitle.textContent = "Edit event";

    if (selCollection) {
      selCollection.value = String(ev.collection_id || "");
      selCollection.disabled = !!params.collectionId;
    }

    inpName.value = ev.name || "";
    inpLoc.value = ev.location || "";
    inpDate.value = (ev.date || "").slice(0, 10);
    inpDesc.value = ev.description || "";
    dialog.showModal();
  }

  function closeDialog() {
    try { dialog.close(); } catch {}
  }

  function isPast(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    d.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    return d < now;
  }

  function isComing(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    d.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    return d >= now;
  }

  function applyFilter(events) {
    if (currentFilter === "past") return events.filter(e => e.date && isPast(e.date));
    if (currentFilter === "coming") return events.filter(e => e.date && isComing(e.date));
    return events;
  }

  // ✅ Render SEM mudar modelo: usa o template original do HTML
  function render(events) {
    if (!listEl) return;
    listEl.innerHTML = "";

    const filtered = applyFilter(events);
    if (!filtered.length) return;

    for (const ev of filtered) {
      const node = tpl.content.firstElementChild.cloneNode(true);

      // imagem
      const img = node.querySelector(".event-picture");
      if (img) {
        if (ev.image) img.src = resolveAssetUrl(ev.image);
        img.alt = ev.name || "Event image";
      }

      // título
      const title = node.querySelector(".event-title");
      if (title) title.textContent = ev.name || "";

      // badge (no original pode estar vazio — então não inventa nada)
      const badge = node.querySelector(".badge");
      if (badge) badge.textContent = ""; // mantém layout original

      // chips
      const chipDate = node.querySelector(".chip-date");
      const chipLoc = node.querySelector(".chip-location");
      if (chipDate) chipDate.textContent = `Date: ${ev.date ? String(ev.date).slice(0,10) : ""}`;
      if (chipLoc) chipLoc.textContent = `Location: ${ev.location || ""}`;

      // botões
      node.querySelector(".edit-button")?.addEventListener("click", () => openEdit(ev));
      node.querySelector(".delete-button")?.addEventListener("click", () => deleteEvent(ev));

      // click abre details (igual feeling original)
      node.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        openDetails(ev);
      });

      listEl.appendChild(node);
    }
  }

  function openDetails(ev) {
    if (!detailDialog) return;

    detailTitle.textContent = ev.name || "Event details";
    detailDesc.textContent = ev.description || "";

    detailCollection.textContent = ev.collection_id ? String(ev.collection_id) : "";
    detailDate.textContent = ev.date ? String(ev.date).slice(0,10) : "";
    detailLocation.textContent = ev.location || "";
    detailRating.textContent = ev.rating ? String(ev.rating) : "";

    if (ev.image) {
      detailImage.src = resolveAssetUrl(ev.image);
      detailImage.style.display = "block";
      detailImage.alt = ev.name || "";
    } else {
      detailImage.style.display = "none";
    }

    detailDialog.showModal();
  }

  async function deleteEvent(ev) {
    const id = ev.event_id;
    if (!id) return;
    if (!confirm("Delete this event?")) return;

    try {
      const fd = new FormData();
      fd.append("action", "delete");
      fd.append("id", String(id));
      await apiPostJson(EVENTS_ENDPOINT, fd);
      toast("Event deleted.", "success");
      await loadEvents();
    } catch (e) {
      console.error(e);
      toast(String(e.message || e), "error");
    }
  }

  async function loadCollectionsIntoSelect() {
    if (!selCollection) return;

    selCollection.innerHTML = `<option value="">-- Select collection --</option>`;

    if (params.collectionId) {
      try {
        const col = await apiGetJson(`${COLLECTIONS_ENDPOINT}?id=${encodeURIComponent(params.collectionId)}&t=${Date.now()}`);
        const c = col.collection || {};
        const opt = document.createElement("option");
        opt.value = String(params.collectionId);
        opt.textContent = c.name ? c.name : `Collection ${params.collectionId}`;
        selCollection.appendChild(opt);
        selCollection.value = String(params.collectionId);
        selCollection.disabled = true;
      } catch {
        const opt = document.createElement("option");
        opt.value = String(params.collectionId);
        opt.textContent = `Collection ${params.collectionId}`;
        selCollection.appendChild(opt);
        selCollection.value = String(params.collectionId);
        selCollection.disabled = true;
      }
      return;
    }

    try {
      const json = await apiGetJson(`${COLLECTIONS_ENDPOINT}?t=${Date.now()}`);
      const arr = json.collections || [];
      for (const c of arr) {
        const opt = document.createElement("option");
        opt.value = String(c.collection_id);
        opt.textContent = c.name ? c.name : `Collection ${c.collection_id}`;
        selCollection.appendChild(opt);
      }
      selCollection.disabled = false;
    } catch (e) {
      console.error(e);
    }
  }

  async function loadEvents() {
    const t = Date.now();

    if (params.collectionId) {
      // tenta os nomes mais comuns
      const tries = [
        `${EVENTS_ENDPOINT}?collection_id=${encodeURIComponent(params.collectionId)}&t=${t}`,
        `${EVENTS_ENDPOINT}?c=${encodeURIComponent(params.collectionId)}&t=${t}`,
        `${EVENTS_ENDPOINT}?collection=${encodeURIComponent(params.collectionId)}&t=${t}`,
      ];

      let lastErr = null;
      for (const u of tries) {
        try {
          const json = await apiGetJson(u);
          const arr = json.events || json.data || json.items || [];
          cached = (Array.isArray(arr) ? arr : []).map(normalizeEvent);
          render(cached);
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error("Could not load events");
    }

    const json = await apiGetJson(`${EVENTS_ENDPOINT}?t=${t}`);
    const arr = json.events || json.data || json.items || [];
    cached = (Array.isArray(arr) ? arr : []).map(normalizeEvent);
    render(cached);
  }

  async function submitForm(e) {
    e.preventDefault();
    formErr.textContent = "";

    const collectionVal = selCollection ? String(selCollection.value || "").trim() : "";
    const name = (inpName.value || "").trim();
    const location = (inpLoc.value || "").trim();
    const date = (inpDate.value || "").trim();
    const description = (inpDesc.value || "").trim();

    if (!collectionVal) return (formErr.textContent = "Collection is required.");
    if (!name) return (formErr.textContent = "Name is required.");
    if (!location) return (formErr.textContent = "Location is required.");
    if (!date) return (formErr.textContent = "Date is required.");

    try {
      const fd = new FormData();
      fd.append("action", mode === "edit" ? "update" : "create");

      // compat
      fd.append("collection", collectionVal);
      fd.append("collection_id", collectionVal);

      if (mode === "edit" && editingId) {
        fd.append("id", String(editingId));
        fd.append("event_id", String(editingId));
      }

      fd.append("name", name);
      fd.append("location", location);
      fd.append("date", date);
      fd.append("description", description);

      if (inpImg && inpImg.files && inpImg.files[0]) {
        fd.append("image", inpImg.files[0]);
      }

      await apiPostJson(EVENTS_ENDPOINT, fd);
      toast(mode === "edit" ? "Event updated." : "Event created.", "success");

      closeDialog();
      await loadEvents();
    } catch (err) {
      console.error(err);
      formErr.textContent = String(err.message || err);
    }
  }

  function wireFilters() {
    filterComing?.addEventListener("click", () => { currentFilter = "coming"; render(cached); });
    filterPast?.addEventListener("click", () => { currentFilter = "past"; render(cached); });
    filterAll?.addEventListener("click", () => { currentFilter = "all"; render(cached); });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await loadCollectionsIntoSelect();
      wireFilters();

      btnNew?.addEventListener("click", openCreate);
      btnCancel?.addEventListener("click", closeDialog);
      detailClose?.addEventListener("click", () => detailDialog.close());
      form?.addEventListener("submit", submitForm);

      await loadEvents();

      if ((params.open || "").toLowerCase() === "create") openCreate();
    } catch (e) {
      console.error(e);
      toast(String(e.message || e), "error");
    }
  });
})();
