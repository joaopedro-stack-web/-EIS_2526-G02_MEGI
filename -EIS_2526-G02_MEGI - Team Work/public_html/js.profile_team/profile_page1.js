// Chaves de armazenamento no localStorage
const PROFILE_LS_KEY = "collecta:profile";
const COLLECTIONS_LS_KEY = "collections-data";

/* ------------------------- Funções auxiliares de data ------------------------- */
// "01/06/1978" -> "1978-06-01" (para <input type="date">)
function toInputDate(br) {
  if (!br) return "";
  const parts = br.split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// "1978-06-01" -> "01/06/1978" (para exibir na tela)
function fromInputDate(iso) {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

/* ------------------------- Modal de editar perfil ------------------------- */
function openEditProfileModal(currentProfile, onSave) {
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
      <h2 style="font-size:18px;margin:0 0 6px">Edit Profile</h2>
      <p style="margin:0 0 12px;opacity:.8">
        Update the user information below.
      </p>
    </div>
    <form style="padding:0 20px 16px;display:flex;flex-direction:column;gap:10px">
      <div>
        <label style="display:block;font-weight:600;margin-bottom:4px">Name *</label>
        <input name="name" type="text" required
          style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border,#ddd)"
          value="${currentProfile.name || ""}">
      </div>

      <div>
        <label style="display:block;font-weight:600;margin-bottom:4px">Date of birth</label>
        <input name="dob" type="date"
          style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border,#ddd)"
          value="${toInputDate(currentProfile.dob || "")}">
      </div>

      <div>
        <label style="display:block;font-weight:600;margin-bottom:4px">Here since</label>
        <input name="since" type="date"
          style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border,#ddd)"
          value="${toInputDate(currentProfile.since || "")}">
      </div>

      <div>
        <label style="display:block;font-weight:600;margin-bottom:4px">E-mail</label>
        <input name="email" type="email"
          style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border,#ddd)"
          value="${currentProfile.email || ""}">
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
        <button type="button" data-role="cancel"
          style="border-radius:10px;padding:8px 12px;border:1px solid var(--border,#ddd);background:#f9fafb;cursor:pointer">
          Cancel
        </button>
        <button type="submit"
          style="border-radius:10px;padding:8px 14px;border:1px solid #000;background:#000;color:#fff;font-weight:600;cursor:pointer">
          Save
        </button>
      </div>
    </form>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const form = box.querySelector("form");
  const cancelBtn = box.querySelector("[data-role='cancel']");

  function closeModal() {
    overlay.remove();
  }

  cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);

    const name = String(data.get("name") || "").trim();
    if (!name) {
      alert("Name is required.");
      return;
    }

    const dobIso = String(data.get("dob") || "");
    const sinceIso = String(data.get("since") || "");
    const email = String(data.get("email") || "").trim();

    const updated = {
      name,
      dob: dobIso ? fromInputDate(dobIso) : "",
      since: sinceIso ? fromInputDate(sinceIso) : "",
      email
    };

    onSave && onSave(updated);
    closeModal();
  });
}

/* ------------------------- Modal de criar coleção (já existia) ------------------------- */
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

    const type = String(data.get("type") || "").trim() || "Miniatures";
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

/* ------------------------- DOMContentLoaded ------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  /* ---- Trocar foto de perfil ---- */
  const changePhotoBtn = document.getElementById("changePhotoBtn");
  const photoInput = document.getElementById("photoInput");
  const profileImage = document.getElementById("profileImage");

  if (changePhotoBtn && photoInput && profileImage) {
    changePhotoBtn.addEventListener("click", () => {
      photoInput.click();
    });

    photoInput.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          profileImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  /* ---- Dados de perfil: carregar, aplicar, editar ---- */
  const nameEl = document.getElementById("profileName");
  const dobEl = document.getElementById("profileDob");
  const sinceEl = document.getElementById("profileSince");
  const emailEl = document.getElementById("profileEmail");

  if (nameEl && dobEl && sinceEl && emailEl) {
    // Perfil inicial vem do HTML
    let profile = {
      name: (nameEl.textContent || "").trim(),
      dob: (dobEl.textContent || "").trim(),
      since: (sinceEl.textContent || "").trim(),
      email: (emailEl.textContent || "").trim()
    };

    // Se houver algo salvo no localStorage, sobrepõe
    try {
      const stored = JSON.parse(localStorage.getItem(PROFILE_LS_KEY) || "null");
      if (stored && typeof stored === "object") {
        profile = {
          ...profile,
          ...stored
        };
      }
    } catch (e) {
      console.warn("Erro lendo perfil do localStorage:", e);
    }

    function applyProfile(p) {
      nameEl.textContent = p.name || "";
      dobEl.textContent = p.dob || "";
      sinceEl.textContent = p.since || "";
      emailEl.textContent = p.email || "";
      try {
        localStorage.setItem(PROFILE_LS_KEY, JSON.stringify(p));
      } catch (e) {
        console.warn("Erro salvando perfil no localStorage:", e);
      }
    }

    // Aplica o estado atual (incluindo o que veio do storage, se tiver)
    applyProfile(profile);

    const editBtn = document.getElementById("editProfileBtn");
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        openEditProfileModal(profile, (updated) => {
          profile = updated;
          applyProfile(profile);
        });
      });
    }
  }

  /* ---- Botão de criar coleção na sidebar ---- */
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
      '[profile-page] Botão de criar coleção não encontrado (data-nav="create" ou #create-collection).'
    );
  }
});
