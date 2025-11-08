/* 
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/ClientSide/javascript.js to edit this template
 */
'use strict';

/*Test events*/
const events = [
  {
    id: "e1",
    collection: "Collection 1",
    name: "Event 1",
    location: "Porto",
    date: "2026-02-01",          
    description: "Event in Porto, in the beginning of February",
    rating: null,
    image: "https://media.istockphoto.com/id/472119842/pt/foto/porto-portugal-old-city.jpg?s=612x612&w=0&k=20&c=s6VnvadPmZwejuyl9-4YO56n9v9VdBXxbEyOjZEL03o="
  },
  {
    id: "e2",
    collection: "Collection 2",
    name: "Event 2",
    location: "Lisbon",
    date: "2025-11-01",         
    description: "Halloween event in Lisbon",
    rating: 4,
    image: "https://images.ctfassets.net/wvgaszxkj2ha/2nWOSeZncy52J8raC3inew/054dae539e25aaf5a576dec877ef7bd7/Trams-in-Lisbon-900x600.jpg?w=3840&q=85&fm=webp"
  },
  {
    id: "e3",
    collection: "Collection 2",
    name: "Event 3",
    location: "Faro",
    date: "2025-12-01",
    description: "Christmas event in Faro",
    rating: null,
    image: "https://www.movingtoportugal.pt/wp-content/uploads/2021/06/Faro-3.png"
  }
];

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

const listEvent = document.getElementById('event-list');   
const newEvent = document.getElementById('new-event');    
const filterComing = document.getElementById('coming');       
const filterPast = document.getElementById('past');         
const filterAll = document.getElementById('all');          

const dialog = document.getElementById('event-dialog');      
const form = document.getElementById('event-form');        
const formTitle = document.getElementById('form-title');        

const fCollection = document.getElementById('form-collection');
const fName = document.getElementById('form-name');
const fLocation = document.getElementById('form-location');
const fDate = document.getElementById('form-date');
const fDesc = document.getElementById('form-desc');

const fImage    = document.getElementById('form-image');
const imageRow  = document.getElementById('image-row');

const cancelBtn = document.getElementById('cancel');


let filter = 'coming';
let editingId = null;




function render() {
  listEvent.innerHTML = '';

  const ordered = [...events].sort((a, b) => a.date.localeCompare(b.date));

  const filtered = ordered.filter(ev => {
    if (filter === 'all') return true;
    if (filter === 'coming') return !isPast(ev.date);
    if (filter === 'past') return isPast(ev.date);
  });
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
  
  // Bild
  if (ev.image) {
    imgEl.src = ev.image;
    imgEl.alt = `Image of ${ev.name || 'event'}`;
    imgEl.style.display = '';
  } else {
    imgEl.removeAttribute('src');
    imgEl.alt = '';
    imgEl.style.display = 'none';
  }

  // Text
  h2.textContent = ev.name || 'Untitled event';
  chipC.textContent = ev.collection ? `Collection: ${ev.collection}` : 'Collection: –';
  chipD.textContent = ev.date ? `Date: ${ev.date}` : 'Date: –';
  chipL.textContent = ev.location ? `City: ${ev.location}` : 'City: –';
  chipR.textContent = `Rating: ${ev.rating ?? 0}/5`;
  desc.textContent = ev.description || 'No description.';

  // Stäng-knapp
  document.getElementById('detail-close').onclick = () => dlg.close();

  dlg.showModal();
}


function makeCard(ev) {
  const article = document.createElement('article');
  article.className = 'event-posts';
  
  if (ev.image) {
    article.style.backgroundImage = `url(${ev.image})`;
    article.classList.add('has-image'); // för ev. extra styling
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

  // titel + chips
  const body = document.createElement('div');
  body.className = 'event-post-body';

  const title = document.createElement('h3');
  title.className = 'event-title';
  title.textContent = ev.name;

  const extra = document.createElement('div');
  extra.className = 'event-extra';

  const dateChip = document.createElement('span');
  dateChip.className = 'chip';
  dateChip.textContent = 'Date: ' + ev.date;
  extra.appendChild(dateChip);

  if (ev.location) {
    const locChip = document.createElement('span');
    locChip.className = 'chip';
    locChip.textContent = 'City: ' + ev.location;
    extra.appendChild(locChip);
  }

  // “snart”-indikator (om inom 7 dagar)
  if (!isPast(ev.date) && isSoon(ev.date)) {
    const soon = document.createElement('span');
    soon.className = 'chip';
    soon.textContent = 'Soon!';
    extra.appendChild(soon);
  }

  // knappar
  const actions = document.createElement('menu');
  actions.className = 'card-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'mini-btn edit';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => openForm(ev.id));

  const delBtn = document.createElement('button');
  delBtn.className = 'mini-btn danger delete';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', () => delEvent(ev.id));

  actions.append(editBtn, delBtn);

  body.append(title, extra, actions);
  article.append(header, body);
  
  
  article.style.cursor = 'pointer';
  article.addEventListener('click', (e) => {
  // Undvik att öppna om man trycker på knappar eller rating
    if (
        e.target.closest('button') ||
        e.target.closest('.rating')
    ) {
      return;
    }
    openDetailDialog(ev);
  });
  
  return article;
}

/* =======================
   5) RATING (stjärnor)
   - klickbart ENDAST om datumet passerat
   ======================= */
function ratingComponent(ev) {
  const wrap = document.createElement('div');
  wrap.className = 'rating';

  const past = isPast(ev.date);
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
   6) FORMULÄR (Create/Update)
   ======================= */


function openForm(id = null) {
  // Om detalj-dialogen råkar vara öppen, stäng den
  const detailDialog = document.getElementById('detail-dialog');
  if (detailDialog && detailDialog.open) detailDialog.close();

  editingId = id;
  form.reset();

  if (id) {
    // ===== EDIT-LÄGE =====
    const ev = events.find(e => e.id === id);
    if (!ev) return; // säkerhet

    formTitle.textContent = 'Edit event';

    fCollection.value = ev.collection || '';
    fName.value       = ev.name || '';
    fLocation.value   = ev.location || '';
    fDate.value       = ev.date || '';
    fDesc.value       = ev.description || '';

    // Visa inte filfält i edit (enligt dina krav)
    if (imageRow) imageRow.style.display = 'none';
  } else {
    // ===== NEW-LÄGE =====
    formTitle.textContent = 'New event';
    if (imageRow) imageRow.style.display = ''; // visa filfältet för nya
  }

  dialog.showModal();
}
cancelBtn.addEventListener('click', () => {
  dialog.close();
});

function delEvent(id) {
  if (!confirm('Radera detta event?')) return;
  const i = events.findIndex(e => e.id === id);
  if (i >= 0) events.splice(i, 1);
  render();
}

/* =======================
   8) FILTER-KNAPPAR
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
   9) NYTT EVENT
   ======================= */
newEvent.addEventListener('click', () => openForm(null));

/* =======================
   10) STARTA
   ======================= */
render();
/* === Universal Nav (Events Page) ============================================
   Purpose:
   - Wire "Events" (self with ?c=...) and "Collections"
   - Auto-inject "← Back to Collection" if absent
   - Use ?c from current URL
============================================================================= */
(() => {
  // --- Helpers ---
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
    // "Events" here just refreshes this page with the right ?c
    wireByTextOrData('events', eventsUrl);
    wireByTextOrData('collections', collectionsUrl);
    ensureBackToCollection();
  });
})();
/* === Universal Profile Wiring (drop-in) =====================================
   Purpose:
   - Make the "Profile" button work on every page (Collection, Item/Index, Events)
   - No global leaks, resilient selectors, and no dependency on other code
============================================================================== */
(() => {
  // Prevent double-binding if this block is included more than once on a page
  if (document.documentElement.dataset.profileWired === '1') return;
  document.documentElement.dataset.profileWired = '1';

  /** Build a lightweight floating menu for the profile button */
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
    // Small hover effect
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

    // Position below the button
    const r = btn.getBoundingClientRect();
    const gap = 8;
    menu.style.left = Math.round(r.left + window.scrollX) + 'px';
    menu.style.top  = Math.round(r.bottom + window.scrollY + gap) + 'px';

    // Actions
    menu.addEventListener('click', (e) => {
      const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
      if (!cmd) return;
      e.preventDefault();
      if (cmd === 'see-profile') {
        // Hook your real profile route here if you have one:
        // window.location.href = '/profile.html';
        console.log('[profile] open profile');
      } else if (cmd === 'logout') {
        try {
          // Demo: clear app keys if you use localStorage for demo auth
          Object.keys(localStorage).forEach(k => { if (k.startsWith('collecta:')) localStorage.removeItem(k); });
        } catch {}
        console.log('[profile] logout');
        // Reload to reflect state
        setTimeout(() => window.location.reload(), 200);
      }
      closeProfileMenu();
    });

    // Close on outside interactions
    document.addEventListener('click', onDocClick, true);
    window.addEventListener('resize', closeProfileMenu);
    window.addEventListener('scroll', closeProfileMenu, true);

    // Initial focus for a11y
    const first = menu.querySelector('.menu__item');
    if (first) first.focus();

    openMenuEl = menu;
  }

  /** Find the "Profile" trigger robustly */
  function findProfileButton() {
    // Priority: aria-label exact
    let btn = document.querySelector('button[aria-label="Open profile"], [data-nav="profile"]');

    if (!btn) {
      // Fallback: any button/anchor in topbar-like areas whose visible text is "Profile"
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
    // Make it look/behave like an interactive control for a11y
    if (!trigger.getAttribute('aria-haspopup')) trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openProfileMenuFor(trigger);
      trigger.setAttribute('aria-expanded', 'true');
    });
  });
})();
