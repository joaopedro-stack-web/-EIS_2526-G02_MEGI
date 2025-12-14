'use strict';

// Agora os eventos vêm do backend, então começamos com vazio
let events = [];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isPast(dateISO) {
  return dateISO < todayISO();
}

function daysUntil(dateISO) {
  return Math.ceil((new Date(dateISO) - new Date(todayISO())) / 86400000);
}

function isSoon(dateISO) {
  const n = daysUntil(dateISO);
  return n >= 0 && n <= 7;
}

const listEvent     = document.getElementById('event-list');
const newEvent      = document.getElementById('new-event');
const filterComing  = document.getElementById('coming');
const filterPast    = document.getElementById('past');
const filterAll     = document.getElementById('all');

const dialog        = document.getElementById('event-dialog');
const form          = document.getElementById('event-form');
const formTitle     = document.getElementById('form-title');

const fCollection   = document.getElementById('form-collection');
const fName         = document.getElementById('form-name');
const fLocation     = document.getElementById('form-location');
const fDate         = document.getElementById('form-date');
const fDesc         = document.getElementById('form-desc');

const fImage        = document.getElementById('form-image');
const imageRow      = document.getElementById('image-row');

const cancelBtn     = document.getElementById('cancel');
const formError     = document.getElementById('form-error');

let filter = 'coming';
let editingId = null;

// ✅ FIX: pega collection id da URL (?c=ID)
function getCollectionIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('c') || params.get('id') || '';
}

// ✅ FIX: abre o modal via URL &open=create
function shouldOpenCreateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get('open') || '').toLowerCase() === 'create';
}

// ============================================================================
// RENDERIZAÇÃO DE EVENTOS (MODELO ORIGINAL)
// ============================================================================
function render() {
  listEvent.innerHTML = '';

  const ordered = [...events].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const filtered = ordered.filter(ev => {
    if (filter === 'all') return true;
    if (filter === 'coming') return !isPast(ev.date || '');
    if (filter === 'past') return isPast(ev.date || '');
    return true;
  });

  if (!filtered.length) {
    const p = document.createElement('p');
    p.textContent = 'No events found for this filter.';
    listEvent.appendChild(p);
    return;
  }

  filtered.forEach(ev => listEvent.appendChild(makeCard(ev)));
}

function openDetailDialog(ev) {
  const dlg   = document.getElementById('detail-dialog');
  const imgEl = document.getElementById('detail-image');
  const h2    = document.getElementById('detail-title');
  const chipC = document.getElementById('detail-collection');
  const chipD = document.getElementById('detail-date');
  const chipL = document.getElementById('detail-location');
  const chipR = document.getElementById('detail-rating');
  const desc  = document.getElementById('detail-desc');

  if (ev.image) {
    imgEl.src = ev.image;
    imgEl.alt = `Image of ${ev.name || 'event'}`;
    imgEl.style.display = '';
  } else {
    imgEl.removeAttribute('src');
    imgEl.alt = '';
    imgEl.style.display = 'none';
  }

  h2.textContent = ev.name || 'Untitled event';
  chipC.textContent = ev.collection ? `Collection: ${ev.collection}` : 'Collection: –';
  chipD.textContent = ev.date ? `Date: ${ev.date}` : 'Date: –';
  chipL.textContent = ev.location ? `City: ${ev.location}` : 'City: –';
  chipR.textContent = `Rating: ${ev.rating ?? 0}/5`;
  desc.textContent  = ev.description || 'No description.';

  document.getElementById('detail-close').onclick = () => dlg.close();
  dlg.showModal();
}

function makeCard(ev) {
  const article = document.createElement('article');
  article.className = 'event-posts';

  if (ev.image) {
    article.style.backgroundImage = `url(${ev.image})`;
    article.classList.add('has-image');
  } else {
    article.style.removeProperty('background-image');
    article.classList.remove('has-image');
  }

  const header = document.createElement('div');
  header.className = 'event-post-title';

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = ev.collection;

  const right = document.createElement('div');
  right.className = 'meta-right';
  right.appendChild(ratingComponent(ev));

  header.append(badge, right);

  const body = document.createElement('div');
  body.className = 'event-post-body';

  const title = document.createElement('h3');
  title.className = 'event-title';
  title.textContent = ev.name;

  const extra = document.createElement('div');
  extra.className = 'event-extra';

  const dateChip = document.createElement('span');
  dateChip.className = 'chip';
  dateChip.textContent = 'Date: ' + (ev.date || '-');
  extra.appendChild(dateChip);

  if (ev.location) {
    const locChip = document.createElement('span');
    locChip.className = 'chip';
    locChip.textContent = 'City: ' + ev.location;
    extra.appendChild(locChip);
  }

  if (!isPast(ev.date || '') && isSoon(ev.date || '')) {
    const soon = document.createElement('span');
    soon.className = 'chip';
    soon.textContent = 'Soon!';
    extra.appendChild(soon);
  }

  const actions = document.createElement('menu');
  actions.className = 'card-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'mini-btn edit';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!ev.id) {
      alert('Missing event ID from backend.');
      return;
    }
    openForm(ev.id);
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'mini-btn danger delete';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!ev.id) {
      alert('Missing event ID from backend.');
      return;
    }
    delEvent(ev.id);
  });

  actions.append(editBtn, delBtn);

  body.append(title, extra, actions);
  article.append(header, body);

  article.style.cursor = 'pointer';
  article.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.rating')) {
      return;
    }
    openDetailDialog(ev);
  });

  return article;
}

/* =======================
   5) RATING (ORIGINAL)
   ======================= */
function ratingComponent(ev) {
  const wrap = document.createElement('div');
  wrap.className = 'rating';

  const past = isPast(ev.date || '');
  const eventId = ev.id;

  for (let i = 1; i <= 5; i++) {
    const el = document.createElement(past ? 'button' : 'span');
    el.className = 'star' + (past ? ' btn' : '');
    el.textContent = (ev.rating || 0) >= i ? '★' : '☆';
    el.setAttribute('aria-label', `${i} stars`);
    el.setAttribute('data-value', i);

    if ((ev.rating || 0) === i) el.setAttribute('aria-pressed', 'true');

    if (past) {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();

        const newRating = i;
        const formData = new FormData();
        formData.append('action', 'rate');
        formData.append('id', eventId);
        formData.append('rating', newRating);

        try {
          const response = await fetch('events_api.php', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();

          if (result.success) {
            await loadEvents();
          } else {
            alert('Could not set rating: ' + (result.error || 'Check if you are authenticated.'));
          }
        } catch (error) {
          console.error('API Error:', error);
          alert('An unexpected error occurred while rating the event.');
        }
      });
    } else {
      el.title = 'Grades can be given after the date';
    }

    wrap.appendChild(el);
  }
  return wrap;
}

/* =======================
   6) FORM (Create/Edit)
   ======================= */
function openForm(id = null) {
  formError.textContent = '';

  if (id) {
    // EDIT EXISTING EVENT
    const ev = events.find(e => e.id == id);
    if (!ev) {
      alert('Could not find event data.');
      return;
    }

    editingId = id;
    formTitle.textContent = 'Edit event';

    if (fCollection) fCollection.value = ev.collection_id ?? '';
    if (fName)       fName.value       = ev.name || '';
    if (fLocation)   fLocation.value   = ev.location || '';
    if (fDate)       fDate.value       = ev.date || '';
    if (fDesc)       fDesc.value       = ev.description || '';

    if (imageRow) imageRow.style.display = '';
  } else {
    // NEW EVENT
    editingId = null;
    form.reset();
    formTitle.textContent = 'New event';
    if (imageRow) imageRow.style.display = '';
  }

  loadCollections().then(() => {
    // ✅ FIX: se tiver ?c=ID, preseleciona no form
    const cid = getCollectionIdFromUrl();
    if (cid && fCollection && !editingId) {
      const opt = Array.from(fCollection.options).find(o => String(o.value) === String(cid));
      if (opt) fCollection.value = String(cid);
    }
    dialog.showModal();
  });
}

cancelBtn.addEventListener('click', () => {
  dialog.close();
});

// ✅ FIX: SUBMIT manda collection_id também (seu PHP exige)
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';

  const formData = new FormData(form);

  // valor do select (name="collection")
  const cid = (fCollection?.value || '').toString().trim() || getCollectionIdFromUrl();

  if (!cid) {
    formError.textContent = 'Select a collection.';
    return;
  }

  // ✅ FIX CRÍTICO:
  // Mantém "collection" (compatível com seu HTML)
  // e adiciona "collection_id" (compatível com seu PHP)
  formData.set('collection', cid);
  formData.set('collection_id', cid);

  if (editingId !== null) {
    formData.set('action', 'update');
    formData.set('id', editingId);
  } else {
    formData.set('action', 'create');
  }

  try {
    const res = await fetch('events_api.php', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!data.success) {
      // mantém mensagem do backend (ex: collection_id inválido)
      formError.textContent = data.error || 'Error saving event.';
      return;
    }

    dialog.close();
    await loadEvents();
  } catch (err) {
    console.error('Error saving event:', err);
    formError.textContent = 'Unexpected error saving event.';
  }
});

async function delEvent(id) {
  const confirmed = confirm('Do you really want to delete this event?');
  if (!confirmed) return;

  const formData = new FormData();
  formData.append('action', 'delete');
  formData.append('id', id);

  try {
    const res = await fetch('events_api.php', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!data.success) {
      alert('Error deleting event: ' + (data.error || 'Unknown error'));
      return;
    }

    await loadEvents();
  } catch (err) {
    console.error('Error deleting event:', err);
    alert('Unexpected error deleting event.');
  }
}

/* =======================
   8) FILTER BUTTONS
   ======================= */
filterComing.addEventListener('click', () => { filter = 'coming'; render(); });
filterPast.addEventListener('click', () => { filter = 'past'; render(); });
filterAll.addEventListener('click', () => { filter = 'all'; render(); });

/* =======================
   9) NEW EVENT
   ======================= */
newEvent.addEventListener('click', () => openForm(null));

/* =======================
   10) LOAD EVENTS FROM BACKEND
   ======================= */
async function loadEvents() {
  try {
    const cid = getCollectionIdFromUrl();

    // ✅ FIX: se tiver ?c=, tenta carregar eventos só dessa coleção
    // (sem mudar visual; só melhora o filtro do backend)
    let url = 'events_api.php';
    if (cid) url = `events_api.php?collection_id=${encodeURIComponent(cid)}`;

    const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
    const data = await res.json();

    if (!data.success) {
      console.error('Error from API:', data.error);
      return;
    }

    events = data.events || [];
    render();
  } catch (err) {
    console.error('Error loading events:', err);
  }
}

// LOAD COLLECTIONS FROM BACKEND (dropdown)
async function loadCollections() {
  try {
    // ✅ Mantive seu endpoint como estava no original.
    // Se no seu projeto o correto for collection_api.php (lista),
    // troque aqui para o arquivo que realmente existe.
    const res = await fetch('collections_api.php', { cache: 'no-store', credentials: 'same-origin' });
    const data = await res.json();

    if (!data.success) {
      console.error('Error loading collections:', data.error);
      return;
    }

    fCollection.innerHTML = '<option value="">-- Select collection --</option>';

    data.collections.forEach(col => {
      const option = document.createElement('option');
      option.value = col.collection_id;
      option.textContent = col.name;
      fCollection.appendChild(option);
    });
  } catch (err) {
    console.error('Network error loading collections:', err);
  }
}

// Inicia
loadEvents().then(async () => {
  // carrega dropdown e, se a URL pedir, abre o create
  await loadCollections();
  if (shouldOpenCreateFromUrl()) openForm(null);
});
