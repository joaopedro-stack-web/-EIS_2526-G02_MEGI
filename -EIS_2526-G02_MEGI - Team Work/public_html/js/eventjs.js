/**
 * event-page.js
 *
 * - Sidebar navigation works (collector/collections/events/community) like other pages
 * - Reads collection id from ?c=<collectionId>
 * - If URL has &open=create => auto opens Create Event modal
 * - Creates event via events_api.php (multipart/form-data) including optional image upload "image"
 */

(() => {
  "use strict";

  /** ----------------------------- helpers ----------------------------- */
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));
  const on = (el, evt, handler) => el && el.addEventListener(evt, handler);

  function escapeHTML(value) {
    const s = String(value ?? "");
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return s.replace(/[&<>"']/g, (ch) => map[ch]);
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function getMeta(name, fallback = "") {
    return (document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? fallback).toString();
  }

  const APP_BASE = getMeta("app-base", "").replace(/\/+$/, "");
  const COLLECTION_PAGE_PATH = getMeta("collection-page-path", "collection-page.html").replace(/^\/+/, "");
  const EVENTS_PAGE_PATH = getMeta("events-page-path", "event.html").replace(/^\/+/, "");

  const withBase = (p) => (APP_BASE ? `${APP_BASE}/` : "") + p;

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

  /** ----------------------------- Sidebar routing (igual collection-page.js) ----------------------------- */
  function buildCollectionsUrl() {
    return withBase(COLLECTION_PAGE_PATH);
  }

  function buildEventsUrl(collectionId) {
    const cid = collectionId || "";
    return withBase(`${EVENTS_PAGE_PATH}${cid ? `?c=${encodeURIComponent(cid)}` : ""}`);
  }

  function wireNavLinks(collectionId) {
    const map = {
      collector: getMeta("collectors-page-path", "Homepage.login.html"),
      collections: buildCollectionsUrl(),
      events: buildEventsUrl(collectionId),
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

    // Create button (sidebar)
    const createBtn = document.querySelector('[data-nav="create"]');
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        // mantém teu comportamento atual (nav.js pode interceptar também)
        console.log("[nav] Create New Collection clicked");
      });
    }
  }

  /** ----------------------------- modal ----------------------------- */
  let lastFocus = null;

  function openModal(content, { labelledBy = "dialog-title" } = {}) {
    lastFocus = document.activeElement;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
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
    box.className = "modal-box";
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

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay);
    });

    return overlay;
  }

  function closeModal(overlay) {
    if (!overlay) return;
    overlay.remove();
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  /** ----------------------------- fields ----------------------------- */
  function buildField({ label, name, type = "text", required = false, attrs = {} }) {
    const id = `f_${name}_${Math.random().toString(36).slice(2, 7)}`;
    const wrap = document.createElement("div");
    wrap.style.margin = "8px 0 12px";
    wrap.innerHTML = `
      <label for="${id}" style="display:block;font-weight:600;margin-bottom:6px">${escapeHTML(label)}${required ? " *" : ""}</label>
      <input id="${id}" name="${escapeHTML(name)}" type="${escapeHTML(type)}" ${required ? "required" : ""}
        style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px">
      <div class="field-error" style="color:#B00020;font-size:12px;margin-top:6px;height:0;overflow:hidden"></div>
    `;
    const input = qs("input", wrap);
    Object.entries(attrs || {}).forEach(([k, v]) => input.setAttribute(k, v));
    const errorEl = qs(".field-error", wrap);
    return { wrap, input, errorEl };
  }

  function buildTextarea({ label, name, rows = 4 }) {
    const id = `t_${name}_${Math.random().toString(36).slice(2, 7)}`;
    const wrap = document.createElement("div");
    wrap.style.margin = "8px 0 12px";
    wrap.innerHTML = `
      <label for="${id}" style="display:block;font-weight:600;margin-bottom:6px">${escapeHTML(label)}</label>
      <textarea id="${id}" name="${escapeHTML(name)}" rows="${rows}"
        style="width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;resize:vertical"></textarea>
    `;
    return { wrap, input: qs("textarea", wrap) };
  }

  function showError(field, msg) {
    if (!field || !field.errorEl) return;
    field.errorEl.textContent = msg || "";
    field.errorEl.style.height = msg ? "auto" : "0";
  }

  function buildImageUpload() {
    const wrap = document.createElement("div");
    wrap.style.margin = "8px 0 12px";
    wrap.innerHTML = `
      <label for="event_image_input" style="display:block;font-weight:600;margin-bottom:6px">
        Event image (optional)
      </label>
      <input id="event_image_input" name="image" type="file" accept="image/*"
        style="display:block;width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;background:#fff" />
      <div id="event_image_preview_wrap" style="margin-top:10px;display:none">
        <img id="event_image_preview" alt="Preview"
          style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;border:1px solid #ddd;display:block" />
      </div>
      <small style="display:block;margin-top:6px;opacity:.75">Upload an image from your computer (JPG/PNG/WebP).</small>
    `;

    const input = qs("#event_image_input", wrap);
    const prevWrap = qs("#event_image_preview_wrap", wrap);
    const prevImg = qs("#event_image_preview", wrap);

    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) {
        prevWrap.style.display = "none";
        prevImg.removeAttribute("src");
        return;
      }
      prevImg.src = URL.createObjectURL(file);
      prevWrap.style.display = "block";
    });

    return { wrap, input };
  }

  /** ----------------------------- modal create event ----------------------------- */
  function modalCreateEvent({ collectionId }) {
    const form = document.createElement("form");
    form.setAttribute("novalidate", "true");

    form.innerHTML = `
      <div style="padding:20px 20px 0">
        <h2 id="dialog-title-event" style="font-size:18px;margin:0 0 8px">Create Event</h2>
        <p style="margin:0 0 10px;opacity:.85">Create an event related to this collection.</p>
        <p style="margin:0 0 10px;font-size:13px;opacity:.75">
          Collection: <strong>${escapeHTML(collectionId || "—")}</strong>
        </p>
      </div>
    `;

    const fields = {
      name: buildField({ label: "Event name", name: "name", required: true }),
      location: buildField({ label: "Location", name: "location", required: true }),
      date: buildField({ label: "Date", name: "date", type: "date", required: true }),
      description: buildTextarea({ label: "Description", name: "description", rows: 4 }),
    };

    fields.date.input.value = new Date().toISOString().slice(0, 10);
    fields.description.input.value = `Event related to collection "${collectionId || "My Collection"}".`;

    const image = buildImageUpload();

    const body = document.createElement("div");
    body.style.padding = "0 20px 10px";
    body.append(fields.name.wrap, fields.location.wrap, fields.date.wrap, image.wrap, fields.description.wrap);

    const footer = document.createElement("div");
    footer.style.cssText = "display:flex;gap:8px;justify-content:flex-end;padding:10px 20px 20px";
    footer.innerHTML = `
      <button type="button" class="btn btn--ghost" data-cmd="cancel">Cancel</button>
      <button type="submit" class="btn" data-cmd="create">Create event</button>
    `;

    form.append(body, footer);

    const overlay = openModal(form, { labelledBy: "dialog-title-event" });

    form.addEventListener("click", (e) => {
      const cmd = e.target.closest("[data-cmd]")?.dataset.cmd;
      if (cmd === "cancel") {
        e.preventDefault();
        closeModal(overlay);
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const v = {
        name: fields.name.input.value.trim(),
        location: fields.location.input.value.trim(),
        date: fields.date.input.value.trim(),
        description: fields.description.input.value.trim(),
      };

      showError(fields.name, "");
      showError(fields.location, "");
      showError(fields.date, "");

      let ok = true;
      if (!v.name) { showError(fields.name, "Required"); ok = false; }
      if (!v.location) { showError(fields.location, "Required"); ok = false; }
      if (!v.date) { showError(fields.date, "Required"); ok = false; }
      if (!ok) return;

      if (!v.description) v.description = `Event related to collection "${collectionId || "My Collection"}".`;

      try {
        const fd = new FormData();
        fd.append("action", "create");
        fd.append("collection", collectionId);
        fd.append("name", v.name);
        fd.append("location", v.location);
        fd.append("date", v.date);
        fd.append("description", v.description);

        if (image.input.files && image.input.files[0]) {
          fd.append("image", image.input.files[0]); // backend expects "image"
        }

        const res = await fetch("events_api.php", { method: "POST", body: fd });
        const json = await res.json();

        if (!res.ok || !json.success) throw new Error(json.error || "Could not create event.");

        closeModal(overlay);
        showToast("Event created.", "success");
      } catch (err) {
        console.error(err);
        showToast("Could not create event.", "error");
      }
    });
  }

  /** ----------------------------- init ----------------------------- */
  async function init() {
    const collectionId = getParam("c") || "";
    const open = (getParam("open") || "").toLowerCase();

    // ✅ wire sidebar links
    wireNavLinks(collectionId);

    const collectionLabel = qs("#collectionLabel");
    const collectionIdDD = qs("#collectionIdDD");
    const backBtn = qs("#backToCollectionBtn");
    const createBtn = qs("#createEventBtn");

    if (collectionLabel) collectionLabel.textContent = collectionId || "—";
    if (collectionIdDD) collectionIdDD.textContent = collectionId || "—";

    // Back to collection
    on(backBtn, "click", () => {
      if (!collectionId) return;
      window.location.href = withBase(`${COLLECTION_PAGE_PATH}?id=${encodeURIComponent(collectionId)}`);
    });

    // Manual create
    on(createBtn, "click", () => {
      if (!collectionId) return showToast("Missing collection id (?c=...)", "error");
      modalCreateEvent({ collectionId });
    });

    // Auto-open
    if (open === "create") {
      if (!collectionId) return showToast("Missing collection id (?c=...)", "error");
      modalCreateEvent({ collectionId });

      // remove open=create to avoid reopen on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("open");
      window.history.replaceState({}, "", url.toString());
    }

    showToast("Events ready.", "success", 1200);
  }

  document.readyState !== "loading" ? init() : document.addEventListener("DOMContentLoaded", init);
})();
