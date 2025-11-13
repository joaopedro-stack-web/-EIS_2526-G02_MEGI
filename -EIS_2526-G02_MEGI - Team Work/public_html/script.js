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

    // Botão eliminar
    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.type = 'button';
    del.title = 'Delete';
    del.textContent = '🗑 Delete';

    // Criar o link para a nova página da coleção
    const link = document.createElement('a');
    link.href = `collection-page.html?id=${id}`;
    link.textContent = 'View Collection';

    // Ensamblar
    card.appendChild(del);
    card.append(image, h3, p, link);
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
 // Criar nova coleção ao clicar no botão "Create New Collection"
if (createBtn) {
  createBtn.addEventListener('click', () => {
    const title = prompt('Collection title:'); // Solicita o título da coleção
    if (!title) return; // Se o título não for fornecido, cancela a criação.

    const desc = prompt('Short description:') || 'No description.'; // Solicita a descrição da coleção
    const img  = prompt('Image URL (leave blank for a random image):'); // Solicita a URL da imagem
    const fallback = `https://picsum.photos/600/400?rand=${Math.floor(Math.random()*10000)}`; // Imagem aleatória como fallback

    const dateCreated = new Date().toLocaleDateString(); // Data de criação

    // Nova coleção com ID único gerado por Date.now()
    const newCollection = {
      id: Date.now(), // Usamos o timestamp para garantir que cada coleção tenha um ID único
      title: title.trim(),
      desc: desc.trim(),
      img: (img && img.trim()) ? img.trim() : fallback, // Se não houver imagem, usa a imagem aleatória
      dateCreated: dateCreated, // Adiciona a data de criação
    };

    // Adiciona a nova coleção no array
    state.collections.unshift(newCollection);
    save(); // Salva no localStorage
    state.page = 1; // Volta para a primeira página para ver a nova coleção
    render(); // Atualiza a lista de coleções

    // Gerar o link para a página de detalhes da nova coleção
    const collectionPageUrl = `collection-page-${newCollection.id}.html`; // Página única para cada coleção
    alert(`Collection created! View your collection at: ${collectionPageUrl}`);

    // Criar a página HTML da nova coleção
    const newPageContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta content="width=device-width, initial-scale=1" name="viewport"/>
        <title>Collection · ${newCollection.title}</title>
        <link rel="stylesheet" href="css.collection.page/collection-page.css">
      </head>
      <body>
        <a class="skip-link" href="#main-content">Skip to content</a>
        <div class="layout">
          <!-- Topbar -->
          <header aria-label="Site top bar" class="topbar" role="banner">
            <div aria-label="Site name" class="topbar__brand">Collecta<span class="topbar__dot">•</span>Hub</div>
            <div class="topbar__actions">
              <button type="button" class="btn btn--ghost" aria-label="Open profile" onclick="window.location.href='profile_page1.html';">
                <svg aria-hidden="true" class="icon" role="img" viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5.33 0-8 2.67-8 6v1h16v-1c0-3.33-2.67-6-8-6Z"></path></svg>
                <span>Profile</span>
              </button>
            </div>
          </header>

          <!-- Sidebar navigation -->
          <aside aria-label="Primary" class="sidebar">
            <nav aria-label="Main navigation" class="sidebar__nav">
              <ul class="sidebar__list">
                <li><a class="sidebar__link" data-nav="collector" href="#">Collector</a></li>
                <li><a class="sidebar__link" data-nav="collections" href="#">Collections</a></li>
                <li><a class="sidebar__link" data-nav="events"      href="#">Events</a></li>
                <li><a class="sidebar__link" data-nav="community"   href="#">Community</a></li>
              </ul>
            </nav>
          </aside>
          
          <!-- Main content -->
          <main aria-label="Collection main content" class="main" id="main-content">
            <!-- Hero -->
            <section aria-label="Collection hero" class="hero">
              <figure class="hero__media">
                <img alt="${newCollection.title} cover image" src="${newCollection.img}" />
                <figcaption class="sr-only">Cover image of the collection.</figcaption>
              </figure>
              <div class="hero__text">
                <h1 class="hero__title">${newCollection.title}</h1>
                <p class="hero__subtitle">${newCollection.desc}</p>
                <p class="hero__date">Created on: ${newCollection.dateCreated}</p> <!-- Exibe a data de criação -->
              </div>
            </section>

            <!-- Collection items -->
            <section aria-label="Collection items grid" class="grid" data-grid>
              <!-- Add collection items here -->
            </section>
          </main>
          
          <footer aria-label="Site footer" class="footer">
            <small>© 2025 CollectaHub · <a href="#" rel="nofollow">Privacy</a></small>
          </footer>
        </div>
      </body>
      </html>
    `;

    // Salva o conteúdo da página como um novo arquivo HTML
    const blob = new Blob([newPageContent], { type: "text/html" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = collectionPageUrl;
    link.click(); // Simula o download da página criada

  });
}

  // Ver mais (paginación)
  if (seeMoreEl) {
    seeMoreEl.addEventListener('click', (e) => {
      e.preventDefault();
      state.page += 1;
      render();
    });
  }

  // Eliminar (delegação sobre la sección para captar clicks en .delete-btn)
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
