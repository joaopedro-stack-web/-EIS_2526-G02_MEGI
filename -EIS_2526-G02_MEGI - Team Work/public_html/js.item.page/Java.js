document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const qs = (s, el = document) => el.querySelector(s);

  const BUILD_TAG = "ITEM-JS v11 (collection banner from DB + correct collections_api.php)";
  toast(`✅ ${BUILD_TAG} carregado`, "success");

  function toast(msg, type = "info") {
    let root = qs("#__toast_item");
    if (!root) {
      root = document.createElement("div");
      root.id = "__toast_item";
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
    const p0 = String(path || "").trim();
    if (!p0) return "";

    // já é absoluto
    if (/^(https?:\/\/|data:|blob:)/i.test(p0)) return p0;

    // normaliza
    let p = p0.replace(/\\/g, "/").replace(/^\.\/+/, "");

    // se já começa com /, usa direto
    if (p.startsWith("/")) return p;

    // tenta app-base (se existir)
    const appBase = getMeta("app-base", "").replace(/\/+$/, "");
    if (appBase) return `${appBase}/${p.replace(/^\/+/, "")}`;

    // fallback: relativo à pasta atual
    const baseDir = location.href.replace(/[#?].*$/, "").replace(/\/[^\/]*$/, "/");
    return baseDir + p.replace(/^\/+/, "");
  }

  function getParams() {
    const u = new URL(location.href);
    return {
      itemId: u.searchParams.get("id") || "",
      collectionId: u.searchParams.get("c") || "",
    };
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

  // ✅ AQUI ESTAVA O BUG: você colocou "collection_api.php", mas o certo é o arquivo REAL do teu projeto
  const COLLECTIONS_ENDPOINT = "collections_api.php";

  // --------- ELEMENTS ----------
  const summaryCard = qs("#summaryCard");
  const editCard = qs("#editCard");
  const editBtn = qs("#editBtn");
  const cancelBtn = qs("#cancelBtn");
  const itemForm = qs("#itemForm");

  const ratingViewStars = document.querySelectorAll("#ratingView .star");
  const ratingEditStars = document.querySelectorAll("#ratingEdit .star");
  const ratingValue = qs("#ratingValue");

  const sumName = qs("#sumName");
  const sumImportance = qs("#sumImportance");
  const sumWeight = qs("#sumWeight");
  const sumPrice = qs("#sumPrice");
  const sumDate = qs("#sumDate");

  const fname = qs("#editName");
  const fimp = qs("#editImportance");
  const fweight = qs("#editWeight");
  const fprice = qs("#editPrice");
  const fdate = qs("#editDate");

  const editPhoto = qs("#editPhoto");
  const itemPhotoPreview = qs("#itemPhotoPreview");

  // HERO
  const heroTitle = qs(".hero__title");
  const heroSubtitle = qs(".hero__subtitle");
  const heroImg = qs(".hero__media img");

  const params = getParams();

  let itemData = {
    item_id: params.itemId || "",
    name: "",
    importance: "",
    weight: "",
    price: "",
    date_of_acquisition: "",
    rating: 0,
    image: null,
  };

  function paintStars(stars, v) {
    const val = parseInt(v || 0, 10);
    stars.forEach((s, i) => (s.style.color = i < val ? "#FFD700" : "#ccc"));
  }

  function normalizeItem(apiItem) {
    return {
      item_id: apiItem.item_id ?? apiItem.id ?? apiItem.uuid ?? apiItem.itemId ?? "",
      name: apiItem.name ?? "",
      importance: apiItem.importance ?? "",
      weight: apiItem.weight ?? "",
      price: apiItem.price ?? "",
      date_of_acquisition: apiItem.date_of_acquisition ?? apiItem.acquisition_date ?? apiItem.acquisition ?? "",
      rating: apiItem.rating ?? 0,
      image: apiItem.image ?? null,
    };
  }

  function updateSummary() {
    sumName.textContent = itemData.name || "";
    sumImportance.textContent = itemData.importance !== "" ? String(itemData.importance) : "";
    sumWeight.textContent = itemData.weight !== "" ? String(itemData.weight) : "";
    sumPrice.textContent = itemData.price !== "" ? String(itemData.price) : "";
    sumDate.textContent = itemData.date_of_acquisition || "";
    paintStars(ratingViewStars, itemData.rating || 0);

    if (itemData.image) itemPhotoPreview.src = resolveAssetUrl(itemData.image);
  }

  function openEdit() {
    summaryCard.style.display = "none";
    editCard.style.display = "block";

    fname.value = itemData.name || "";
    fimp.value = itemData.importance ?? "";
    fweight.value = itemData.weight ?? "";
    fprice.value = itemData.price ?? "";
    fdate.value = itemData.date_of_acquisition ?? "";

    ratingValue.value = String(itemData.rating || 0);
    paintStars(ratingEditStars, itemData.rating || 0);
  }

  function closeEdit() {
    editCard.style.display = "none";
    summaryCard.style.display = "block";
    paintStars(ratingViewStars, itemData.rating || 0);
  }

  // ✅ aplica o banner da coleção vindo do BANCO
  function applyCollectionHero(c) {
    if (!c) return;

    if (heroTitle) heroTitle.textContent = c.name || "Collection";

    if (heroSubtitle) {
      // você pediu: "nome da coleção e tipo do item"
      // aqui: coleção -> name, e "type" da coleção aparece
      heroSubtitle.textContent = c.type ? String(c.type) : (c.description || "Item");
    }

    // ✅ imagem da coleção no BD
    const imgPath = c.image || c.cover_image || "";
    if (heroImg && imgPath) {
      const src = resolveAssetUrl(imgPath);
      heroImg.src = src;
      heroImg.alt = `${c.name || "Collection"} banner`;

      // fallback visual caso a imagem salva tenha caminho quebrado
      heroImg.onerror = () => {
        heroImg.onerror = null;
        heroImg.src = "https://picsum.photos/seed/collecta_banner/1400/500";
      };
    }
  }

  async function loadCollectionHero() {
    if (!params.collectionId) return;

    try {
      // tenta cache
      const raw = sessionStorage.getItem(`collecta_collection_${params.collectionId}`);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && typeof cached === "object") applyCollectionHero(cached);
      }
    } catch (_) {}

    // ✅ busca coleção no endpoint correto
    try {
      const json = await apiGetJson(
        `${COLLECTIONS_ENDPOINT}?id=${encodeURIComponent(params.collectionId)}&t=${Date.now()}`
      );
      const c = json.collection || null;
      if (!c) return;

      try {
        sessionStorage.setItem(`collecta_collection_${params.collectionId}`, JSON.stringify(c));
      } catch (_) {}

      applyCollectionHero(c);
    } catch (e) {
      console.error(e);
      toast("Não consegui carregar banner da coleção.\n" + (e.message || e), "error");
    }
  }

  if (editPhoto) {
    editPhoto.addEventListener("change", () => {
      const file = editPhoto.files && editPhoto.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => (itemPhotoPreview.src = reader.result);
      reader.readAsDataURL(file);
    });
  }

  ratingEditStars.forEach((star) => {
    star.addEventListener("mouseover", () => paintStars(ratingEditStars, parseInt(star.dataset.value, 10)));
    star.addEventListener("mouseout", () => paintStars(ratingEditStars, ratingValue.value));
    star.addEventListener("click", () => {
      ratingValue.value = String(parseInt(star.dataset.value, 10) || 0);
      paintStars(ratingEditStars, ratingValue.value);
    });
  });

  async function loadItemFromApi() {
    if (!params.itemId) {
      toast("URL sem ?id= — não dá pra carregar item.", "error");
      updateSummary();
      return;
    }

    const endpoint = await detectItemsEndpoint();

    let json = null;
    try {
      json = await apiGetJson(`${endpoint}?item_id=${encodeURIComponent(params.itemId)}&t=${Date.now()}`);
    } catch {
      json = await apiGetJson(`${endpoint}?id=${encodeURIComponent(params.itemId)}&t=${Date.now()}`);
    }

    const apiItem = json.item || json.data || json.result || null;
    if (!apiItem) throw new Error("API retornou success mas não retornou item.");

    itemData = normalizeItem(apiItem);
    updateSummary();
  }

  editBtn?.addEventListener("click", openEdit);
  cancelBtn?.addEventListener("click", closeEdit);

  itemForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = (fname.value || "").trim();
    const imp = (fimp.value || "").trim();
    if (!name) return toast("Name é obrigatório.", "error");
    if (imp === "") return toast("Importance é obrigatório.", "error");

    itemData.name = name;
    itemData.importance = imp;
    itemData.weight = (fweight.value || "").trim();
    itemData.price = (fprice.value || "").trim();
    itemData.date_of_acquisition = (fdate.value || "").trim();
    itemData.rating = parseInt(ratingValue.value || "0", 10) || 0;

    const fd = new FormData();
    fd.append("action", "update");
    fd.append("item_id", params.itemId);
    fd.append("id", params.itemId);

    fd.append("name", itemData.name);
    fd.append("importance", itemData.importance);
    if (itemData.weight !== "") fd.append("weight", itemData.weight);
    if (itemData.price !== "") fd.append("price", itemData.price);
    if (itemData.date_of_acquisition !== "") {
      fd.append("date_of_acquisition", itemData.date_of_acquisition);
      fd.append("acquisition_date", itemData.date_of_acquisition);
    }
    fd.append("rating", String(itemData.rating));

    if (editPhoto && editPhoto.files && editPhoto.files[0]) {
      fd.append("image", editPhoto.files[0]);
    }

    try {
      const endpoint = await detectItemsEndpoint();
      await apiPostJson(endpoint, fd);

      await loadItemFromApi();
      closeEdit();
      toast("Item atualizado.", "success");
    } catch (err) {
      console.error(err);
      toast("Erro ao salvar:\n" + (err.message || err), "error");
    }
  });

  (async () => {
    try {
      await loadCollectionHero();  // ✅ banner da coleção do banco
      await loadItemFromApi();
    } catch (e) {
      console.error(e);
      toast(String(e.message || e), "error");
    }
  })();
});
