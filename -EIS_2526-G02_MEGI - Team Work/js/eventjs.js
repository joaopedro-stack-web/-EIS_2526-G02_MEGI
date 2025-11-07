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
