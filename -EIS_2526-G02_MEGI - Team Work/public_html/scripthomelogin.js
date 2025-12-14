(() => {
  "use strict";

  const COLLECTIONS_API = 'collections_api.php';
  const METRICS_API = 'dashboard_metrics.php';

  const listSection = document.querySelector('#collections-list');
  const seeMoreBtn = listSection?.querySelector('a.see-more');

  let collections = [];
  let page = 1;
  const pageSize = 5;

  function escapeHTML(str) {
    return String(str ?? '')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeImage(url) {
    return url || 'https://picsum.photos/seed/collection/900/600';
  }

  function createCollectionCard(col) {
    const article = document.createElement('article');
    article.className = 'collection-item';
    article.dataset.collectionId = col.collection_id;

    // segue seu CSS:
    // img + h3 + p + a.view-btn + button.delete-btn
    article.innerHTML = `
      <button type="button" class="delete-btn" aria-label="Remove collection" title="Remove">
        Remove
      </button>

      <img
        src="${normalizeImage(col.cover_image || col.image)}"
        alt="Cover of ${escapeHTML(col.name)}"
        loading="lazy"
      />

      <h3>${escapeHTML(col.name)}</h3>

      <p>${escapeHTML(col.description || 'No description provided.')}</p>

      <a class="view-btn"
         href="collection-page.html?id=${encodeURIComponent(col.collection_id)}">
        View Collection
      </a>
    `;

    // delete
    article.querySelector('.delete-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!confirm(`Remove collection "${col.name}"?`)) return;

      try {
        const res = await fetch(COLLECTIONS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ action: 'delete', id: col.collection_id })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to remove collection');

        collections = collections.filter(c => String(c.collection_id) !== String(col.collection_id));
        article.remove();
        loadMetrics();
      } catch (err) {
        alert(err.message);
      }
    });

    return article;
  }

  function clearCards() {
    listSection?.querySelectorAll('.collection-item').forEach(el => el.remove());
  }

  function renderCollections() {
    const limit = page * pageSize;

    clearCards();

    // garante que See More exista (se não existir, ainda renderiza)
    collections.slice(0, limit).forEach(col => {
      const card = createCollectionCard(col);

      // ✅ CRÍTICO: insere SEMPRE ANTES do See More
      if (seeMoreBtn) listSection.insertBefore(card, seeMoreBtn);
      else listSection.appendChild(card);
    });

    if (seeMoreBtn) {
      seeMoreBtn.style.display = collections.length > limit ? 'block' : 'none';
    }
  }

  async function loadCollections() {
    try {
      const res = await fetch(COLLECTIONS_API, { credentials: 'same-origin' });
      const data = await res.json();
      collections = data.collections || [];
      page = 1;
      renderCollections();
    } catch (err) {
      console.error('[home] loadCollections failed', err);
    }
  }

  async function loadMetrics() {
    try {
      const res = await fetch(METRICS_API, { credentials: 'same-origin' });
      const data = await res.json();
      if (!data.success) return;

      const tc = document.getElementById('total-collections');
      const ti = document.getElementById('total-items');
      const ar = document.getElementById('average-rating');

      if (tc) tc.textContent = String(data.metrics.total_collections ?? 0);
      if (ti) ti.textContent = String(data.metrics.total_items ?? 0);
      if (ar) ar.textContent = String(data.metrics.average_rating ?? 0);
    } catch (err) {
      console.error('[home] loadMetrics failed', err);
    }
  }

  // See More
  seeMoreBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    page++;
    renderCollections();
  });

  // quando cria collection em qualquer página
  document.addEventListener('collecta:collection-created', (e) => {
    collections.unshift(e.detail);
    page = 1;
    renderCollections();
    loadMetrics();
  });

  loadCollections();
  loadMetrics();
})();
