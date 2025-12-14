(() => {
  "use strict";

  // Endpoint do seu backend (mantém como você já usa)
  const API = "collections_api.php";

  // Seletores aceitos: funciona em TODAS as páginas
  const CREATE_SELECTORS = [
    "#create-collection",              // seu botão da Home
    '[data-nav="create"]',             // botão Create da sidebar
    '[data-action="create-collection"]'// caso você use esse padrão
  ].join(",");

  function askName() {
    const name = prompt("Enter collection name:");
    if (!name) return null;
    const trimmed = name.trim();
    return trimmed.length ? trimmed : null;
  }

  async function createCollection(name) {
    // ✅ Envia como FormData (PHP recebe em $_POST SEM dor)
    const fd = new FormData();
    fd.append("action", "create");
    fd.append("name", name);

    const res = await fetch(API, {
      method: "POST",
      credentials: "same-origin",
      body: fd
    });

    // tenta JSON sempre
    const data = await res.json().catch(() => null);

    if (!res.ok || !data || !data.success) {
      const msg =
        (data && data.error) ? data.error :
        `Create failed (HTTP ${res.status})`;
      throw new Error(msg);
    }

    return data.collection;
  }

  // Captura click em QUALQUER lugar e verifica se foi em botão "Create"
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(CREATE_SELECTORS);
    if (!btn) return;

    e.preventDefault();

    const name = askName();
    if (!name) return;

    // trava dupla-clique
    const prevDisabled = btn.disabled;
    btn.disabled = true;

    try {
      const collection = await createCollection(name);

      // Emite evento global pra Home/qualquer página atualizar cards
      document.dispatchEvent(new CustomEvent("collecta:collection-created", {
        detail: collection
      }));

      // Redireciona para a página da collection
      // (rota padrão do seu projeto)
      const id = collection.collection_id ?? collection.id;
      if (id !== undefined && id !== null) {
        window.location.href = `collection-page.html?id=${encodeURIComponent(id)}`;
      } else {
        // fallback seguro
        window.location.href = "Homepage.login.html";
      }

    } catch (err) {
      alert(err.message);
      console.error("[Create Collection] error:", err);
    } finally {
      btn.disabled = prevDisabled;
    }
  }, true); // capture = true ajuda a ganhar de handlers antigos
})();
