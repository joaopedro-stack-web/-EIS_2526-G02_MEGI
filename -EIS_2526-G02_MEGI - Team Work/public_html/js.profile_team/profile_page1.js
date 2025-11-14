// Handle "Change Profile Picture" button
document.addEventListener("DOMContentLoaded", () => {
  const changePhotoBtn = document.getElementById("changePhotoBtn");
  const photoInput = document.getElementById("photoInput");
  const profileImage = document.getElementById("profileImage");

  // When user clicks "Change Profile Picture", open file selector
  changePhotoBtn.addEventListener("click", () => {
    photoInput.click();
  });

  // When a new image is chosen, display it immediately
  photoInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        profileImage.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
});

 /* ==========================
   * 2) Create New Collection
   * ========================== */

  const COLLECTIONS_LS_KEY = "collections-data";

  function openCreateCollectionModal() {
    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem(COLLECTIONS_LS_KEY) || "[]");
      if (!Array.isArray(existing)) existing = [];
    } catch (e) {
      console.warn("Erro lendo collections-data:", e);
      existing = [];
    }

    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.45)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: "16px"
    });

    const box = document.createElement("div");
    Object.assign(box.style, {
      width: "min(520px, 100%)",
      background: "var(--surface, #fff)",
      color: "var(--text, #111)",
      borderRadius: "16px",
      boxShadow: "0 20px 60px rgba(0,0,0,.25)",
      overflow: "hidden",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    });

    box.innerHTML = `
      <div style="padding:20px 20px 10px">
        <h2 style="font-size:18px;margin:0 0 6px">Create New Collection</h2>
        <p style="margin:0 0 12px;opacity:.8">
          Fill the fields below to create a new collection.
        </p>
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
          <small style="display:block;margin-top:4px;opacity:.7">
            If empty, a random image will be used.
          </small>
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

    const formCol = box.querySelector("form");
    const cancelBtn = box.querySelector("[data-role='cancel']");

    function closeModal() {
      overlay.remove();
    }

    cancelBtn.addEventListener("click", function (e) {
      e.preventDefault();
      closeModal();
    });

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    formCol.addEventListener("submit", function (e) {
      e.preventDefault();
      const data = new FormData(formCol);

      const name = String(data.get("name") || "").trim();
      if (!name) {
        alert("Name is required.");
        return;
      }

      const type =
        String(data.get("type") || "").trim() || "Miniatures";
      const dateCreated =
        String(data.get("dateCreated") || "") ||
        new Date().toISOString().slice(0, 10);
      const desc = String(data.get("desc") || "").trim();
      const imgInput = String(data.get("img") || "").trim();

      const fallbackImg =
        "https://picsum.photos/seed/collection-" +
        Date.now() +
        "/1200/600";
      const img = imgInput || fallbackImg;

      const newId = Date.now().toString();

      const newCollection = {
        id: newId,
        title: name,
        desc,
        img,
        type,
        dateCreated
      };

      existing.unshift(newCollection);
      localStorage.setItem(
        COLLECTIONS_LS_KEY,
        JSON.stringify(existing)
      );

      closeModal();

      // Redireciona para a Collection Page dessa nova coleção
      window.location.href =
        "collection-page.html?id=" + encodeURIComponent(newId);
    });
  }

  // Liga o botão de criar coleção no profile
  // (usa o mesmo data-nav="create" da sidebar/topbar, se existir)
  const createBtn =
    document.querySelector('[data-nav="create"]') ||
    document.getElementById("create-collection");

  if (createBtn) {
    createBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openCreateCollectionModal();
    });
  } else {
    console.warn(
      "[profile-page] Botão de criar coleção não encontrado (data-nav=\"create\" ou #create-collection)."
    );
  }
