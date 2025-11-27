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

// ============================================================================
// >>> NOVO: lógica compartilhada de "Create New Collection" (modal + redirect)
// ============================================================================

const COLLECTIONS_LS_KEY = 'collections-data';

function openCreateCollectionModal() {
  const existing = JSON.parse(localStorage.getItem(COLLECTIONS_LS_KEY) || '[]');

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
      <p style="margin:0 0 12px;opacity:.8">Fill the fields below to create a new collection.</p>
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
        <small style="display:block;margin-top:4px;opacity:.7">If empty, a random image will be used.</small>
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
  const cancelBtnModal = box.querySelector('[data-role="cancel"]');

  function close() {
    overlay.remove();
  }

  cancelBtnModal.addEventListener('click', (e) => {
    e.preventDefault();
    close();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  formCol.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(formCol);

    const name = (data.get('name') || '').toString().trim();
    if (!name) {
      alert('Name is required.');
      return;
    }

    const type        = (data.get('type') || '').toString().trim() || 'Miniatures';
    const dateCreated = (data.get('dateCreated') || '').toString() || new Date().toISOString().slice(0, 10);
    const desc        = (data.get('desc') || '').toString().trim();
    const imgInput    = (data.get('img') || '').toString().trim();
    const fallbackImg = `https://picsum.photos/seed/collection-${Date.now()}/1200/600`;
    const img         = imgInput || fallbackImg;

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
    localStorage.setItem(COLLECTIONS_LS_KEY, JSON.stringify(existing));

    close();

    window.location.href = `collection-page.html?id=${encodeURIComponent(newId)}`;
  });
}

function attachCreateCollectionHandler() {
  const btn = document.querySelector('#create-collection, [data-nav="create"]');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openCreateCollectionModal();
  });
}

// ============================================================================
// RENDERIZAÇÃO DE EVENTOS
// ============================================================================

function render() {
  listEvent.innerHTML = '';

  const ordered = [...events].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const filtered = ordered.filter(ev => {
    if (filter === 'all')   return true;
    if (filter === 'coming') return !isPast(ev.date || '');
    if (filter === 'past')   return isPast(ev.date || '');
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

  h2.textContent   = ev.name || 'Untitled event';
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
    alert('Edit event is not implemented with database yet.');
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'mini-btn danger delete';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    alert('Delete event is not implemented with database yet.');
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
   5) RATING
   ======================= */
function ratingComponent(ev) {
  const wrap = document.createElement('div');
  wrap.className = 'rating';

  const past = isPast(ev.date || '');
  for (let i = 1; i <= 5; i++) {
    const el = document.createElement(past ? 'button' : 'span');
    el.className = 'star' + (past ? ' btn' : '');
    el.textContent = (ev.rating || 0) >= i ? '★' : '☆';
    el.setAttribute('aria-label', `${i} stars`);
    if ((ev.rating || 0) === i) el.setAttribute('aria-pressed', 'true');

    if (past) {
      el.addEventListener('click', () => {
        ev.rating = i;
        render();
      });
    } else {
      el.title = 'Grades can be given after the date';
    }
    wrap.appendChild(el);
  }
  return wrap;
}

/* =======================
   6) FORM (Create)
   ======================= */

function openForm(id = null) {
  // por enquanto só implementamos "novo evento" com backend
  if (id) {
    alert('Edit event is not implemented with database yet.');
    return;
  }

  editingId = null;
  form.reset();
  formError.textContent = '';
  formTitle.textContent = 'New event';

  if (imageRow) imageRow.style.display = '';

  dialog.showModal();
}

cancelBtn.addEventListener('click', () => {
  dialog.close();
});

// Envio do formulário para o backend (criar novo evento)
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  formError.textContent = '';

  const formData = new FormData(form);

  try {
    const res = await fetch('events_api.php', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!data.success) {
      formError.textContent = data.error || 'Error saving event.';
      return;
    }

    dialog.close();
    await loadEvents(); // recarrega eventos do banco
  } catch (err) {
    console.error('Error saving event:', err);
    formError.textContent = 'Unexpected error saving event.';
  }
});

function delEvent(id) {
  alert('Delete event is not implemented with database yet.');
}

/* =======================
   8) FILTER BUTTONS
   ======================= */
filterComing.addEventListener('click', () => {
  filter = 'coming';
  render();
});
filterPast.addEventListener('click', () => {
  filter = 'past';
  render();
});
filterAll.addEventListener('click', () => {
  filter = 'all';
  render();
});

/* =======================
   9) NEW EVENT
   ======================= */
newEvent.addEventListener('click', () => openForm(null));

/* =======================
   10) LOAD EVENTS FROM BACKEND
   ======================= */
async function loadEvents() {
  try {
    const res = await fetch('events_api.php');
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

// Inicia
loadEvents();

// >>> conecta o botão "Create New Collection" desta página
attachCreateCollectionHandler();

/* === Universal Nav (Events Page) ============================================ */
(() => {
  const getMeta = (n, f='') => (document.querySelector(`meta[name="${n}"]`)?.getAttribute('content') ?? f) + '';
  const APP_BASE = getMeta('app-base').replace(/\/+$/, '');
  const EVENTS_PAGE = getMeta('events-page-path', 'event.html').replace(/^\/+/, '');
  const COLLECTION_PAGE = getMeta('collection-page-path', 'collection-page.html').replace(/^\/+/, '');
  const withBase = (p) => (APP_BASE ? `${APP_BASE}/` : '') + p;

  const params = new URLSearchParams(window.location.search);
  const COLLECTION_ID = params.get('c') || 'default-collection';

  const eventsUrl = withBase(`${EVENTS_PAGE}?c=${encodeURIComponent(COLLECTION_ID)}`);
  const collectionsUrl = withBase(`${COLLECTION_PAGE}?c=${encodeURIComponent(COLLECTION_ID)}`);

  function wireByTextOrData(selectorText, url) {
    const prefer = document.querySelector(`[data-nav="${selectorText}"]`);
    if (prefer) {
      if (prefer.tagName === 'A') prefer.setAttribute('href', url);
      prefer.addEventListener('click', (e) => { if (prefer.tagName !== 'A') e.preventDefault(); window.location.href = url; });
    }
    document.querySelectorAll('a,button').forEach(el => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (t === selectorText) {
        if (el.tagName === 'A') el.setAttribute('href', url);
        el.addEventListener('click', (e) => { if (el.tagName !== 'A') e.preventDefault(); window.location.href = url; });
      }
    });
  }

  function ensureBackToCollection() {
    const id = 'backToCollectionBtn';
    if (!document.getElementById(id)) {
      const btn = document.createElement('button');
      btn.id = id;
      btn.type = 'button';
      btn.className = 'btn btn--secondary';
      btn.textContent = '← Back to Collection';
      (document.querySelector('main') || document.body).prepend(btn);
      btn.addEventListener('click', () => window.location.href = collectionsUrl);
    }
  }

  function ready(fn){ document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(() => {
    wireByTextOrData('events', eventsUrl);
    wireByTextOrData('collections', collectionsUrl);
    ensureBackToCollection();
  });
})();

/* === Universal Profile Wiring ============================================== */
(() => {
  if (document.documentElement.dataset.profileWired === '1') return;
  document.documentElement.dataset.profileWired = '1';
  function buildProfileMenu() {
    const wrap = document.createElement('div');
    wrap.className = 'profile-menu';
    Object.assign(wrap.style, {
      position: 'absolute',
      minWidth: '200px',
      background: 'var(--surface, #fff)',
      color: 'inherit',
      borderRadius: '12px',
      boxShadow: '0 16px 40px rgba(0,0,0,.18)',
      padding: '8px',
      zIndex: 10000
    });
    wrap.innerHTML = `
      <ul class="menu__list" role="menu" aria-label="Profile options" style="list-style:none;margin:0;padding:0">
        <li><button class="menu__item" role="menuitem" data-cmd="see-profile"
          style="width:100%;text-align:left;border:0;background:none;padding:10px;border-radius:8px;cursor:pointer">See profile</button></li>
        <li><button class="menu__item" role="menuitem" data-cmd="logout"
          style="width:100%;text-align:left;border:0;background:none;padding:10px;border-radius:8px;cursor:pointer">Logout</button></li>
      </ul>
    `;
    wrap.addEventListener('mouseover', (e) => {
      const it = e.target.closest('.menu__item'); if (!it) return;
      it.style.background = 'rgba(0,0,0,.06)';
    });
    wrap.addEventListener('mouseout', (e) => {
      const it = e.target.closest('.menu__item'); if (!it) return;
      it.style.background = 'transparent';
    });
    return wrap;
  }

  let openMenuEl = null;

  function closeProfileMenu() {
    if (openMenuEl) {
      openMenuEl.remove();
      openMenuEl = null;
    }
    document.removeEventListener('click', onDocClick, true);
    window.removeEventListener('resize', closeProfileMenu);
    window.removeEventListener('scroll', closeProfileMenu, true);
  }

  function onDocClick(e) {
    if (!openMenuEl) return;
    if (!openMenuEl.contains(e.target)) closeProfileMenu();
  }

  function openProfileMenuFor(btn) {
    closeProfileMenu();
    const menu = buildProfileMenu();
    document.body.appendChild(menu);

    const r = btn.getBoundingClientRect();
    const gap = 8;
    menu.style.left = Math.round(r.left + window.scrollX) + 'px';
    menu.style.top  = Math.round(r.bottom + window.scrollY + gap) + 'px';

    menu.addEventListener('click', (e) => {
      const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
      if (!cmd) return;
      e.preventDefault();
      if (cmd === 'see-profile') {
        console.log('[profile] open profile');
      } else if (cmd === 'logout') {
        try {
          Object.keys(localStorage).forEach(k => { if (k.startsWith('collecta:')) localStorage.removeItem(k); });
        } catch {}
        console.log('[profile] logout');
        setTimeout(() => window.location.reload(), 200);
      }
      closeProfileMenu();
    });

    document.addEventListener('click', onDocClick, true);
    window.addEventListener('resize', closeProfileMenu);
    window.addEventListener('scroll', closeProfileMenu, true);

    const first = menu.querySelector('.menu__item');
    if (first) first.focus();

    openMenuEl = menu;
  }

  function findProfileButton() {
    let btn = document.querySelector('button[aria-label="Open profile"], [data-nav="profile"]');
    if (!btn) {
      const candidates = Array.from(document.querySelectorAll(
        '.topbar .btn, .topbar__actions .btn, header .btn, a, button'
      ));
      btn = candidates.find(el => /profile/i.test((el.textContent || '').trim()));
    }
    return btn || null;
  }

  function ready(fn){ document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(() => {
    const trigger = findProfileButton();
    if (!trigger) {
      console.warn('[profile] trigger not found on this page');
      return;
    }
    if (!trigger.getAttribute('aria-haspopup')) trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openProfileMenuFor(trigger);
      trigger.setAttribute('aria-expanded', 'true');
    });
  });
})();
