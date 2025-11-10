/* ===========================================
 
   =========================================== */

(function () {
  const PAGE = document.body.getAttribute('data-page'); // 'collections', 'home', etc.
  const LS_KEY = 'collections-data';

  // Elements (existirán o no según la página)
  const listSection = document.querySelector('#collections-list');
  const titleEl     = listSection?.querySelector('h2');
  const seeMoreEl   = listSection?.querySelector('.see-more');
  const createBtn   = document.querySelector('#create-collection');
  const statsBar    = document.querySelector('#stats');
  const loginInfo   = document.querySelector('#login-info');

  // Seed de datos por si localStorage está vacío
  const seedData = [
    { id: 1, title: 'Collection 1', desc: 'Some description about the collection...', img: 'https://picsum.photos/600/400?1' },
    { id: 2, title: 'Collection 2', desc: 'Some description about the collection...', img: 'https://picsum.photos/600/400?2' },
    { id: 3, title: 'Collection 3', desc: 'Some description about the collection...', img: 'https://picsum.photos/600/400?3' },
    { id: 4, title: 'Collection 4', desc: 'Some description about the collection...', img: 'https://picsum.photos/600/400?4' },
    { id: 5, title: 'Collection 5', desc: 'Some description about the collection...', img: 'https://picsum.photos/600/400?5' },
    { id: 6, title: 'Collection 6', desc: 'Extra to demo See More…',             img: 'https://picsum.photos/600/400?6' },
    { id: 7, title: 'Collection 7', desc: 'Extra to demo See More…',             img: 'https://picsum.photos/600/400?7' },
  ];

  // Estado
  const state = {
    collections: JSON.parse(localStorage.getItem(LS_KEY) || 'null') ?? seedData,
    pageSize: 5,
    page: 1
  };

  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(state.collections));
  }

  function clearRendered() {
    if (!listSection) return;
    // Dejamos el <h2> y .see-more; quitamos el resto
    [...listSection.children].forEach(el => {
      if (el !== titleEl && el !== seeMoreEl) listSection.removeChild(el);
    });
  }

  function createCard({ id, title, desc, img }) {
    const card = document.createElement('div');
    card.className = 'collection-item';
    card.dataset.id = id; // para ubicar y borrar

    // Imagen
    const image = document.createElement('img');
    image.src = img;
    image.alt = title;

    // Título y texto
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const p = document.createElement('p');
    p.textContent = desc;

    // Botón eliminar
    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.type = 'button';
    del.title = 'Delete';
    del.textContent = '🗑 Delete';

    // Ensamblar
    card.appendChild(del);
    card.append(image, h3, p);
    return card;
  }

  function render() {
    if (!listSection) return;
    clearRendered();

    const end   = state.page * state.pageSize;
    const toShow = state.collections.slice(0, end);

    // Insertar tarjetas
    toShow.forEach(item => {
      listSection.insertBefore(createCard(item), seeMoreEl);
    });

    // Mostrar/ocultar "See More"
    if (seeMoreEl) {
      const hasMore = end < state.collections.length;
      seeMoreEl.style.display = hasMore ? 'inline-block' : 'none';
    }
  }

  // --------- Interacciones ----------
  // Crear nueva colección (sidebar)
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      const title = prompt('Collection title:');
      if (!title) return;

      const desc = prompt('Short description:') || 'No description.';
      const img  = prompt('Image URL (leave blank for a random image):');
      const fallback = `https://picsum.photos/600/400?rand=${Math.floor(Math.random()*10000)}`;

      state.collections.unshift({
        id: Date.now(),
        title: title.trim(),
        desc: desc.trim(),
        img: (img && img.trim()) ? img.trim() : fallback
      });

      save();
      state.page = 1; // volver a primera página para ver la nueva
      render();
    });
  }

  // Ver más (paginación)
  if (seeMoreEl) {
    seeMoreEl.addEventListener('click', (e) => {
      e.preventDefault();
      state.page += 1;
      render();
    });
  }

  // Eliminar (delegación sobre la sección para captar clicks en .delete-btn)
  if (listSection) {
    listSection.addEventListener('click', (e) => {
      const btn = e.target.closest('.delete-btn');
      if (!btn) return;

      const card = btn.closest('.collection-item');
      const id = Number(card?.dataset.id);
      if (!id) return;

      const ok = confirm('Are you sure you want to delete this collection?');
      if (!ok) return;

      // Eliminar del estado
      state.collections = state.collections.filter(c => c.id !== id);
      save();

      // Si después de borrar ya no hay “más”, ajusta la página para no dejar página vacía
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
        alert('Open profile ');
      }
    });
  }

  // Boot: sólo render en páginas que tengan #collections-list
  if (PAGE === 'collections' || listSection) {
    render();
  }
})();
