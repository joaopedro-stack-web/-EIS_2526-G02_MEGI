(function () {
  const PAGE = document.body.getAttribute('data-page'); // 'collections', 'home', etc.

  // Elements
  const listSection = document.querySelector('#collections-list');
  const titleEl     = listSection?.querySelector('h2');
  const seeMoreEl   = listSection?.querySelector('.see-more') || listSection?.querySelector('[data-nav="collections"]');
  const createBtn   = document.querySelector('#create-collection');
  const statsBar    = document.querySelector('#stats');
  const loginInfo   = document.querySelector('#login-info');

  // Seed de dados (fallback se o servidor falhar ou retornar vazio)
  const seedData = [
    { id: 1, title: 'Collection 1', desc: 'Some description about the collection...', img: 'https://picsum.photos/600/400?1' },
    { id: 2, title: 'Collection 2', desc: 'Some description about the collection...', img: 'https://picsum.photos/600/400?2' },
    { id: 3, title: 'Collection 3', desc: 'Some description about the collection...', img: 'https://picsum.photos/600/400?3' },
    { id: 4, title: 'Collection 4', desc: 'Some description about the collection...', img: 'https://picsum.photos/600/400?4' },
    { id: 5, title: 'Collection 5', desc: 'Some description about the collection...', img: 'https://picsum.photos/600/400?5' },
    { id: 6, title: 'Collection 6', desc: 'Extra to demo See More…',             img: 'https://picsum.photos/600/400?6' },
    { id: 7, title: 'Collection 7', desc: 'Extra to demo See More…',             img: 'https://picsum.photos/600/400?7' },
  ];

  // Estado agora começa vazio e será preenchido com o que vier do PHP
  const state = {
    collections: [],
    pageSize: 5,
    page: 1,
    loading: false
  };

  // ---------------- Helpers de UI ----------------
  function clearRendered() {
    if (!listSection) return;
    // Mantém apenas o <h2> e o link "See More"; remove o resto
    [...listSection.children].forEach(el => {
      if (el !== titleEl && el !== seeMoreEl) listSection.removeChild(el);
    });
  }

  function createCard({ id, title, desc, img }) {
    const card = document.createElement('div');
    card.className = 'collection-item';
    card.dataset.id = id;

    const image = document.createElement('img');
    image.src = img;
    image.alt = title;

    const h3 = document.createElement('h3');
    h3.textContent = title;

    const p = document.createElement('p');
    p.textContent = desc;

    // Botão Delete (ainda só front-end, não remove do banco)
    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.type = 'button';
    del.title = 'Delete';
    del.textContent = '🗑 Delete';

    // Link "View Collection" (usa o ID do banco)
    const link = document.createElement('a');
    link.href = `collection-page.html?id=${encodeURIComponent(id)}`;
    link.textContent = 'View Collection';
    link.className = 'view-btn';

    card.appendChild(del);
    card.append(image, h3, p, link);
    return card;
  }

  // ---------------- Integração com PHP ----------------
  function mapBackendCollection(c) {
    return {
      id: c.collection_id,
      title: c.name || 'Untitled Collection',
      desc: c.description || '',
      img: c.image || `https://picsum.photos/seed/collection-${c.collection_id}/600/400`,
    };
  }

  async function fetchCollectionsFromServer() {
    state.loading = true;
    try {
      // GET collections_api.php
      // Ideal: collections_api.php usa $_SESSION['user_id' ] para filtrar o usuário logado
      const res = await fetch('collections_api.php');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not load collections');

      const arr = Array.isArray(data.collections) ? data.collections : [];
      state.collections = arr.map(mapBackendCollection);

      // Fallback se o servidor retornar vazio
      if (!state.collections.length) {
        state.collections = seedData.slice();
      }
    } catch (err) {
      console.error('[home] fetchCollectionsFromServer failed', err);
      // Fallback completo se falhar
      if (!state.collections.length) {
        state.collections = seedData.slice();
      }
    } finally {
      state.loading = false;
    }
  }

  async function render(options = {}) {
    if (!listSection) return;

    const forceReload = !!options.forceReload;

    // Carrega do servidor se ainda não carregou ou se forceReload = true
    if (forceReload || !state.collections.length) {
      await fetchCollectionsFromServer();
    }

    clearRendered();

    const end    = state.page * state.pageSize;
    const toShow = state.collections.slice(0, end);

    toShow.forEach(item => {
      listSection.insertBefore(createCard(item), seeMoreEl);
    });

    if (seeMoreEl) {
      const hasMore = end < state.collections.length;
      seeMoreEl.style.display = hasMore ? 'inline-block' : 'none';
    }
  }

  // =============== MODAL "CREATE NEW COLLECTION" (integrado com PHP) ===============
  function openCreateCollectionModal() {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,.45)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 9999,
      padding: '16px'
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      width: 'min(520px, 100%)',
      background: 'var(--surface, #fff)',
      color: 'var(--text, #111)',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0,0,0,.25)',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
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

    const formCol = box.querySelector('form');
    const cancelBtn = box.querySelector('[data-role="cancel"]');

    function close() {
      overlay.remove();
    }

    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      close();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // SUBMIT -> envia para collections_api.php (igual na collection-page)
    formCol.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(formCol);

      const name = (data.get('name') || '').toString().trim();
      if (!name) {
        alert('Name is required.');
        return;
      }

      const type = (data.get('type') || '').toString().trim() || 'Miniatures';
      const dateCreated =
        (data.get('dateCreated') || '').toString() ||
        new Date().toISOString().slice(0, 10);
      const desc = (data.get('desc') || '').toString().trim();
      const imgInput = (data.get('img') || '').toString().trim();

      const fallbackImg =
        'https://picsum.photos/seed/collection-' + Date.now() + '/1200/600';
      const img = imgInput || fallbackImg;

      const payload = new FormData();
      payload.append('action', 'create');
      payload.append('name', name);
      payload.append('type', type);
      payload.append('creation_date', dateCreated);
      payload.append('description', desc);
      payload.append('image', img);

      fetch('collections_api.php', {
        method: 'POST',
        body: payload
      })
        .then(res => res.json())
        .then(result => {
          if (!result || !result.success) {
            const msg = result && result.error ? result.error : 'Erro ao criar coleção.';
            alert(msg);
            return;
          }

          close();

          const redirectUrl =
            result.redirect_url ||
            `collection-page.html?id=${encodeURIComponent(result.collection_id)}`;

          // Depois de criar, já abre a Collection Page da nova coleção
          window.location.href = redirectUrl;
        })
        .catch(err => {
          console.error(err);
          alert('Erro inesperado ao criar coleção.');
        });
    });
  }

  // --------- Interações ----------

  // Botão "Create New Collection"
  if (createBtn) {
    createBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCreateCollectionModal();
    });
  }

  // Ver mais (paginação local)
  if (seeMoreEl) {
    seeMoreEl.addEventListener('click', (e) => {
      // se for link <a>, não queremos navegar
      if (seeMoreEl.tagName === 'A') e.preventDefault();
      state.page += 1;
      render();
    });
  }

  // Eliminar (apenas front-end, não apaga no banco ainda)
  if (listSection) {
    listSection.addEventListener('click', (e) => {
      const btn = e.target.closest('.delete-btn');
      if (!btn) return;

      const card = btn.closest('.collection-item');
      const id = Number(card?.dataset.id);
      if (!id) return;

      const ok = confirm('Are you sure you want to delete this collection?');
      if (!ok) return;

      state.collections = state.collections.filter(c => Number(c.id) !== id);

      const maxPage = Math.max(1, Math.ceil(state.collections.length / state.pageSize));
      if (state.page > maxPage) state.page = maxPage;

      render();
    });
  }

  // Stats demo
  if (statsBar) {
    statsBar.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') return;
      const label = e.target.textContent.trim();
      if (label.includes('Collections Total')) {
        alert(`Total collections: ${state.collections.length}`);
      } else if (label.includes('Items Total')) {
        alert(`Approx items total: ~${state.collections.length * 20}`);
      } else if (label.includes('Community Review')) {
        alert('Community Review: ★★★★☆ (prototype)');
      } else if (label.includes('Average Rating')) {
        alert('Average Rating: 4.2 (prototype)');
      }
    });
  }

  // Config / Profile demo
  if (loginInfo) {
    loginInfo.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') return;
      const label = e.target.textContent.trim();
      if (label === 'Config') {
        alert('Open settings');
      } else if (label === 'Profile') {
        alert('Open profile');
      }
    });
  }

  // Boot: só render em páginas que tenham #collections-list
  async function init() {
    if (PAGE === 'collections' || listSection) {
      await render();
    }
  }

  init();
})();
