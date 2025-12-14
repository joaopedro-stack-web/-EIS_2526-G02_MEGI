/*!
 * Collecta Navigation Kit
 * One file to wire topbar/side buttons consistently across all pages.
 *
 * ✅ Logo/brand click:
 *    Clicking the Collecta•Hub logo/brand in the top bar always goes to the
 *    Collector page (Homepage.login.html) (i.e., your Home/Login).
 *
 * - Works with anchors <a> or <button>
 * - Preserves ?c=<collectionId> across internal pages (collections/events/community)
 * - No global collisions; exposes: window.CollectaNav.init(options)
 * - Auto-inits on DOMContentLoaded (so pages that forget to call init still work)
 */

(() => {
  "use strict";

  const DOC = document;
  if (window.CollectaNav?.__ready) return; // idempotent

  let __initCalled = false;

  /** ----------------------------- helpers ----------------------------- */
  const getMeta = (n, f = "") => (DOC.querySelector(`meta[name="${n}"]`)?.getAttribute("content") ?? f) + "";
  const trimSlash = (s = "") => s.replace(/^\/+/, "").replace(/\/+$/, "");

  const withBase = (p) => {
    const base = trimSlash(getMeta("app-base", ""));
    return base ? `/${base}/${trimSlash(p)}` : trimSlash(p);
  };

  const getCollectionId = () => {
    // Priority 1: ?c=...
    const c = new URLSearchParams(location.search).get("c");
    if (c) return c;
    // Priority 2: element with data-collection-id
    const el = DOC.querySelector("[data-collection-id]");
    if (el?.dataset?.collectionId) return el.dataset.collectionId;
    // Fallback
    return "default-collection";
  };

  // Route map (from meta)
  const ROUTES = {
    item: trimSlash(getMeta("item-page-path", "index.html")),
    events: trimSlash(getMeta("events-page-path", "event.html")),
    collections: trimSlash(getMeta("collection-page-path", "collection-page.html")),
    collector: trimSlash(getMeta("collectors-page-path", "Homepage.login.html")),
    community: trimSlash(getMeta("community-page-path", "team_page2.html")),
  };

  // Build URLs (preserve ?c only where it matters)
  const urlFor = {
    collector: () => withBase(`${ROUTES.collector}?c=${encodeURIComponent(getCollectionId())}`),
    collections: () => withBase(`${ROUTES.collections}?c=${encodeURIComponent(getCollectionId())}`),
    events: () => withBase(`${ROUTES.events}?c=${encodeURIComponent(getCollectionId())}`),
    community: () => withBase(`${ROUTES.community}?c=${encodeURIComponent(getCollectionId())}`),
    // Brand/logo should go straight to Collector landing/login
    brand: () => withBase(`${ROUTES.collector}`),
  };

  // Bind a control to a URL (works for <a> or <button>)
  function wireToUrl(el, href) {
    if (!el) return;
    if (el.tagName === "A") el.setAttribute("href", href);

    el.addEventListener("click", (e) => {
      // Keep standard new-tab behaviors
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1 || el.getAttribute("target") === "_blank") return;
      if (el.tagName !== "A") e.preventDefault();
      window.location.href = href;
    });
  }

  // Find elements by data-nav="xxx" or visible text fallback
  function findTargets(key) {
    const prefer = Array.from(DOC.querySelectorAll(`[data-nav="${key}"]`));
    if (prefer.length) return prefer;
    const txt = key.toLowerCase();
    return Array.from(DOC.querySelectorAll("a,button")).filter(
      (el) => (el.textContent || "").trim().toLowerCase() === txt
    );
  }

  // Default pop actions (you can override via init options)
  function defaultProfile() {
    alert("Profile: plug your profile route or menu here.\nTip: pass onProfile() in CollectaNav.init(...) to customize.");
  }
  function defaultConfig() {
    alert("Config: open your settings modal/page here.\nTip: pass onConfig() in CollectaNav.init(...) to customize.");
  }
  function defaultCreate() {
    alert("Create New Collection: open your creation flow here.\nTip: pass onCreate() in CollectaNav.init(...) to customize.");
  }

  // Ensure a “← Back to Collection” exists (optional helper for Item/Events pages)
  function ensureBackToCollection() {
    const id = "backToCollectionBtn";
    if (DOC.getElementById(id)) return;
    const btn = DOC.createElement("button");
    btn.id = id;
    btn.type = "button";
    btn.className = "btn btn--secondary";
    btn.textContent = "← Back to Collection";
    (DOC.querySelector("main") || DOC.body).prepend(btn);
    wireToUrl(btn, urlFor.collections());
  }

  // ✅ Wire the topbar brand/logo to Collector page (Homepage.login.html)
  function wireBrand() {
    const selectors = [
      ".topbar__brand",
      ".topbar_brand",
      "[data-brand=\"collecta\"]",
      "[aria-label=\"Site name\"]",
      // legacy: only wire .brand if it looks like the Collecta brand (avoid the dot span)
      ".brand",
    ];

    const raw = [];
    selectors.forEach((sel) => DOC.querySelectorAll(sel).forEach((el) => raw.push(el)));

    // Filter: keep only “real” brand containers (not tiny dot spans, etc.)
    const candidates = raw.filter((el) => {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (!text) return false;
      if (!text.includes("collecta")) return false; // avoids wiring random .brand
      // ignore very tiny nodes (like just "•")
      if (text === "•" || text === "." || text.length < 4) return false;
      return true;
    });

    // If multiple match (due to nested spans), prefer the outermost ones
    const unique = [];
    candidates.forEach((el) => {
      if (unique.some((u) => u.contains(el))) return;
      unique.push(el);
    });

    unique.forEach((el) => {
      if (el.dataset?.brandWired === "1") return;
      if (el.dataset) el.dataset.brandWired = "1";

      el.style.cursor = "pointer";
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
      if (!el.hasAttribute("role")) el.setAttribute("role", "link");

      wireToUrl(el, urlFor.brand());

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.location.href = urlFor.brand();
        }
      });
    });
  }

  // ---- Public API ----------------------------------------------------------
  function init(options = {}) {
    __initCalled = true;

    const {
      onProfile = defaultProfile,
      onConfig = defaultConfig,
      onCreate = defaultCreate,
      autoBackButton = false,
    } = options;

    // ✅ Brand/logo click on ALL pages that have it
    wireBrand();

    // Navigation buttons (pages)
    findTargets("collector").forEach((el) => wireToUrl(el, urlFor.collector()));
    findTargets("collections").forEach((el) => wireToUrl(el, urlFor.collections()));
    findTargets("events").forEach((el) => wireToUrl(el, urlFor.events()));
    findTargets("community").forEach((el) => wireToUrl(el, urlFor.community()));

    // Action buttons (callbacks)
    findTargets("profile").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        onProfile(el);
      });
      el.setAttribute("aria-haspopup", "menu");
      el.setAttribute("aria-expanded", "false");
    });
    findTargets("config").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        onConfig(el);
      })
    );
    findTargets("create").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        onCreate(el);
      })
    );

    if (autoBackButton) ensureBackToCollection();
  }

  window.CollectaNav = { init, __ready: true };

  // Auto-init: pages that forget to call init() still get the brand click + sidebar wiring.
  DOC.addEventListener("DOMContentLoaded", () => {
    if (!__initCalled) init({});
  });
})();

/* 
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/ClientSide/javascript.js to edit this template
 */
