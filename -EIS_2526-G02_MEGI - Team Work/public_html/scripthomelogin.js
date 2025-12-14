(function () {
  const API = 'collections_api.php';

  // Elements
  const listSection = document.querySelector('#collections-list');
  const titleEl = listSection?.querySelector('h2');

  const seeMoreEl =
    listSection?.querySelector('.see-more') ||
    listSection?.querySelector('a.see-more') ||
    listSection?.querySelector('a[data-nav="collections"]') ||
    listSection?.querySelector('a[href="#"]') ||
    null;

  const createBtn = document.querySelector('#create-collection');

  const state = {
    collections: [],
    pageSize: 5,
    page: 1,
    serverLoaded: false,
    loading: false
  };

  function clearRendered() {
    if (!listSection) return;
    [...listSection.children].forEach(el => {
      if (el !== titleEl && el !== seeMoreEl) listSection.removeChild(el);
    });
  }

  function normalizeImageUrl(imgPathOrUrl) {
    if (!imgPathOrUrl) return null;

    // Já é URL completa
    if (/^https?:\/\//i.test(imgPathOrUrl)) return imgPathOrUrl;

    // Caminho relativo vindo do PHP (ex: uploads/collections/abc.jpg)
    // Resolve corretamente mesmo se a página estiver em subpasta
    return new URL(imgPathOrUrl, window.location.href).toString();
  }

  function createCard({ id, title, desc, img }) {
    const card = document.createElement('div');
    card.className = 'collection-item';
    card.dataset.id = String(id);

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.type = 'button';
    del.title = 'Delete';
    del.textContent = '🗑 Delete';

    const image = document.createElement('img');
    image.src = img;
    image.alt = title;

    const h3 = document.createElement('h3');
    h3.textContent = title;

    const p = document.createElement('p');
    p.textContent = desc;

    const link = document.createElement('a');
    link.href = `collection-page.html?id=${encodeURIComponent(id)}`;
    link.textContent = 'View Collection';
    link.className = 'view-btn';

    card.appendChild(del);
    card.append(image, h3, p, link);
    return card;
  }

  function mapBackendCollection(c) {
    const backendId = c.collection_id ?? c.id ?? c.collectionId ?? null;

    const imgResolved =
      normalizeImageUrl(c.image || c.img) ||
      `https://picsum.photos/seed/collection-${backendId}/600/400`;

    return {
      id: backendId,
      title: c.name || c.title || 'Untitled Collection',
      desc: c.description || c.desc || '',
      img: imgResolved
    };
  }

  async function fetchCollectionsFromServer() {
    state.loading = true;
    try {
      const res = await fetch(API, { credentials: 'same-origin' });

      if (res.status === 401) {
        window.location.href = 'Homepage.logout.html';
        return;
      }

      if (!res.ok) throw new Error('HTTP ' + res.status);

      const data = await res.json();
      if (!data || data.success !== true) {
        throw new Error(data?.error || 'Could not load collections');
      }

      const arr = Array.isArray(data.collections) ? data.collections : [];
      state.collections = arr.map(mapBackendCollection).filter(x => x.id != null);
      state.serverLoaded = true;

    } catch (err) {
      console.error('[home] fetchCollectionsFromServer failed', err);
      alert('Erro ao carregar coleções do servidor. Veja o Console (F12).');
      state.collections = [];
      state.serverLoaded = true;
    } finally {
      state.loading = false;
    }
  }

  async function render(options = {}) {
    if (!listSection) return;

    const forceReload = !!options.forceReload;

    if (forceReload || !state.serverLoaded) {
      await fetchCollectionsFromServer();
    }

    clearRendered();

    const end = state.page * state.pageSize;
    const toShow = state.collections.slice(0, end);

    toShow.forEach(item => {
      listSection.insertBefore(createCard(item), seeMoreEl || null);
    });

    if (seeMoreEl) {
      const hasMore = end < state.collections.length;
      seeMoreEl.style.display = hasMore ? 'inline-block' : 'none';
    }
  }

  // ===== MODAL CREATE (com upload de arquivo) =====
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

      <form style="padding:0 20px 16px;display:flex;flex-direction:column;gap:10px" enctype="multipart/form-data">
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
          <input name="creation_date" type="date"
            style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border,#ddd)">
        </div>

        <div>
          <label style="display:block;font-weight:600;margin-bottom:4px">Description</label>
          <textarea name="description" rows="3"
            style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border,#ddd);resize:vertical"></textarea>
        </div>

        <div>
          <label style="display:block;font-weight:600;margin-bottom:4px">Image (from your computer)</label>
          <input name="image" type="file" accept="image/*"
            style="width:100%;padding:6px">
          <small style="display:block;margin-top:4px;opacity:.7">
            JPG/PNG/WEBP (optional)
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

    function close() { overlay.remove(); }

    cancelBtn.addEventListener('click', (e) => { e.preventDefault(); close(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    formCol.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = new FormData(formCol);
      payload.append('action', 'create');

      const name = (payload.get('name') || '').toString().trim();
      if (!name) {
        alert('Name is required.');
        return;
      }

      // Se data vazia, preenche hoje (compatível com seu DB)
      const cd = (payload.get('creation_date') || '').toString().trim();
      if (!cd) payload.set('creation_date', new Date().toISOString().slice(0, 10));

      try {
        const res = await fetch(API, {
          method: 'POST',
          body: payload,
          credentials: 'same-origin'
        });

        if (res.status === 401) {
          window.location.href = 'Homepage.logout.html';
          return;
        }

        const data = await res.json();
        if (!data || !data.success) {
          alert(data?.error || 'Erro ao criar coleção.');
          return;
        }

        close();

        // ✅ recarrega da base (assim você vê que salvou mesmo)
        state.page = 1;
        await render({ forceReload: true });

      } catch (err) {
        console.error(err);
        alert('Erro inesperado ao criar coleção.');
      }
    });
  }

  // Create button
  if (createBtn) {
    createBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCreateCollectionModal();
    });
  }

  // See more local pagination
  if (seeMoreEl) {
    seeMoreEl.addEventListener('click', (e) => {
      const isPager =
        (seeMoreEl.tagName === 'A' && (seeMoreEl.getAttribute('href') === '#' || seeMoreEl.classList.contains('see-more'))) ||
        seeMoreEl.tagName === 'BUTTON';

      if (!isPager) return;

      if (seeMoreEl.tagName === 'A') e.preventDefault();
      state.page += 1;
      render();
    });
  }

  // ✅ DELETE REAL (backend) + reload
  if (listSection) {
    listSection.addEventListener('click', async (e) => {
      const btn = e.target.closest('.delete-btn');
      if (!btn) return;

      const card = btn.closest('.collection-item');
      const id = Number(card?.dataset.id);
      if (!id) return;

      const ok = confirm('Are you sure you want to delete this collection?');
      if (!ok) return;

      try {
        const fd = new FormData();
        fd.append('action', 'delete');
        fd.append('collection_id', id);

        const res = await fetch(API, {
          method: 'POST',
          body: fd,
          credentials: 'same-origin'
        });

        if (res.status === 401) {
          window.location.href = 'Homepage.logout.html';
          return;
        }

        const data = await res.json();
        if (!data || !data.success) {
          alert(data?.error || 'Erro ao deletar coleção.');
          return;
        }

        state.page = 1;
        await render({ forceReload: true });

      } catch (err) {
        console.error(err);
        alert('Erro inesperado ao deletar coleção.');
      }
    });
  }

  // Boot
  render({ forceReload: true });
})();
