// item-page.js (versão atualizada — substitui o ficheiro existente)

// ---------- Helpers ----------
function showAlert(msg) { alert(msg); }
function log(...args) { console.log("[ItemPage]", ...args); }

// ---------- Elementos principais ----------
const itemDataForm = document.getElementById('itemDataForm');
const photoUploadInput = document.getElementById('photoUpload');        // input[type=file]
const itemPhotoPreview = document.getElementById('itemPhotoPreview');  // <img> preview
const ratingHidden = document.getElementById('ratingValue');           // hidden rating input

// Segurança: garanta que os elementos existem
if (!itemDataForm) {
  console.error("Form '#itemDataForm' não encontrado no DOM.");
}
if (!photoUploadInput) {
  console.error("Input '#photoUpload' não encontrado no DOM.");
}
if (!itemPhotoPreview) {
  console.error("Image preview '#itemPhotoPreview' não encontrado no DOM.");
}

// ---------- Image preview imediato ao escolher ficheiro ----------
if (photoUploadInput && itemPhotoPreview) {
  photoUploadInput.addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      itemPhotoPreview.src = reader.result;
      log("Preview atualizado com imagem local (antes do save).");
    };
    reader.onerror = () => {
      console.error("Erro ao ler ficheiro de imagem.");
      showAlert("Não foi possível carregar a imagem para preview.");
    };
    reader.readAsDataURL(f);
  });
}

// ---------- Validação do formulário ----------
function validateForm(form) {
  if (!form) return false;

  const name = form.querySelector('[name="itemName"]');
  const importance = form.querySelector('[name="importance"]');
  const description = form.querySelector('[name="description"]');

  if (!name || !importance || !description) {
    showAlert("Formulário incompleto (campos obrigatórios não encontrados).");
    console.error("Campos obrigatórios ausentes no form.");
    return false;
  }

  if (!name.value.trim()) {
    showAlert("Please fill out the Name field.");
    name.focus();
    return false;
  }

  if (importance.value.trim() === "") {
    showAlert("Please provide an Importance value between 0 and 10.");
    importance.focus();
    return false;
  }
  const impNum = Number(importance.value);
  if (isNaN(impNum) || impNum < 0 || impNum > 10) {
    showAlert("Importance must be a number between 0 and 10.");
    importance.focus();
    return false;
  }

  if (!description.value.trim()) {
    showAlert("Please add a Description for the item.");
    description.focus();
    return false;
  }

  return true;
}

// ---------- Atualiza painel resumo (.stats) ----------
function updateSummary(payload) {
  const setIf = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setIf('summaryName', payload.itemName || '—');
  setIf('summaryImportance', payload.importance || '—');
  setIf('summaryWeight', payload.weight ? `${payload.weight} g` : '—');
  setIf('summaryPrice', payload.price ? `€ ${payload.price}` : '—');
  setIf('summaryDate', payload.acquisition || '—');
}

// ---------- Simulated SAVE handler (trata ficheiro se existir) ----------
if (itemDataForm) {
  itemDataForm.addEventListener('submit', (ev) => {
    ev.preventDefault();

    // valida
    if (!validateForm(itemDataForm)) return;

    // montar FormData
    const fd = new FormData(itemDataForm);

    // assegura que o rating também é enviado (se existir)
    if (ratingHidden) fd.set('rating', ratingHidden.value || '0');

    // função que executa a "simulação de update" após tratar possivelmente a imagem
    function doSimulatedSave(imageDataURL) {
      // se tivemos uma imagem, inclui no payload simulado
      if (imageDataURL) fd.set('imageDataUrl', imageDataURL);

      // produzir uma "versão simples" do payload para logging
      const payload = {};
      fd.forEach((v, k) => { payload[k] = v; });

      // simulação: log e feedback ao user
      log("Simulated SAVE payload:", payload);
      showAlert("Save Changes: Item updated (simulation).");

      // atualizar painel resumo com dados do payload
      updateSummary(payload);

      // manter valores no form (não resetamos)
    }

    // Verifica se existe ficheiro no input
    const file = (photoUploadInput && photoUploadInput.files && photoUploadInput.files[0]) || null;
    if (file) {
      // Lê o ficheiro como DataURL primeiro (simula upload + obtém preview)
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataUrl = reader.result;
          // atualiza preview imediatamente (fallback caso o evento change não tenha corrido)
          if (itemPhotoPreview) itemPhotoPreview.src = dataUrl;
          doSimulatedSave(dataUrl); // prossegue com a "salvaguarda" simulada
        } catch (err) {
          console.error("Erro ao processar ficheiro:", err);
          showAlert("Erro ao processar a imagem. Tente novamente.");
        }
      };
      reader.onerror = () => {
        console.error("FileReader error ao ler ficheiro.");
        showAlert("Não foi possível ler a imagem. Tente outro ficheiro.");
      };
      reader.readAsDataURL(file);
    } else {
      // sem ficheiro: prossegue de imediato
      doSimulatedSave(null);
    }
  });
}

// ---------- Simulated DELETE ----------
const deleteBtn = document.getElementById('deleteItemBtn');
if (deleteBtn) {
  deleteBtn.addEventListener('click', () => {
    if (!confirm("Are you sure you want to DELETE this item? This action is simulated.")) return;
    // Simular remoção
    log("Simulated DELETE for item.");
    showAlert("Item deleted (simulation).");

    // limpar UI / form / preview / summary
    if (itemDataForm) itemDataForm.reset();
    if (itemPhotoPreview) itemPhotoPreview.src = "assets/item-placeholder.jpg";
    if (ratingHidden) ratingHidden.value = "0";
    // limpar resumo
    ['summaryName','summaryImportance','summaryWeight','summaryPrice','summaryDate'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
  });
}

// ---------- DICAS DE DEBUG (no console) ----------
log("Script carregado. Elementos:", {
  itemDataFormExists: !!itemDataForm,
  photoUploadExists: !!photoUploadInput,
  previewExists: !!itemPhotoPreview
});

// Se ainda não funcionar no teu ambiente:
// 1) Abre DevTools (F12) → Console — vê se há erros mostrados pelo script.
// 2) Confirma que os IDs no HTML correspondem exatamente aos usados aqui:
//    - itemDataForm, photoUpload, itemPhotoPreview, ratingValue, deleteItemBtn
// 3) Verifica permissões do browser (algumas extensões bloqueiam FileReader em locais locais).
// ---------- Robust star-rating widget (copy/replace this in item-page.js) ----------
(function () {
  // aguarda DOM pronto
  document.addEventListener('DOMContentLoaded', () => {
    const starsContainer = document.getElementById('stars');
    const ratingHidden = document.getElementById('ratingValue');

    if (!starsContainer) {
      console.warn('Star widget: #stars não encontrado no DOM.');
      return;
    }
    if (!ratingHidden) {
      console.warn('Star widget: #ratingValue não encontrado no DOM.');
      // cria fallback para evitar erros
    }

    // pega rating inicial do atributo data-initial-rating ou do hidden input
    const initialFromAttr = parseInt(starsContainer.dataset.initialRating || '', 10);
    const initial = Number.isInteger(initialFromAttr) ? initialFromAttr : (ratingHidden ? parseInt(ratingHidden.value || '0', 10) : 0);
    let currentRating = Math.max(0, Math.min(5, initial || 0));

    // limpa conteúdo e constrói 5 spans
    starsContainer.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement('span');
      s.className = 'star';
      s.textContent = '★';
      s.dataset.value = String(i);
      s.setAttribute('role', 'radio');
      s.setAttribute('aria-checked', i === currentRating ? 'true' : 'false');
      s.setAttribute('aria-label', `${i} star`);
      s.tabIndex = 0;
      // estilos visuais sem depender de classes externas
      s.style.cursor = 'pointer';
      s.style.userSelect = 'none';
      s.style.padding = '0 4px';
      s.style.fontSize = '1.3rem'; // ajustável conforme teu layout

      // eventos
      s.addEventListener('mouseover', () => paintStars(i));
      s.addEventListener('focus', () => paintStars(i));
      s.addEventListener('mouseout', () => paintStars(currentRating));
      s.addEventListener('blur', () => paintStars(currentRating));
      s.addEventListener('click', () => setRating(i));
      s.addEventListener('keydown', (e) => {
        // Enter/Space para selecionar
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setRating(i);
          return;
        }
        // Setas para navegar foco
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          const next = Math.min(5, i + 1);
          const target = starsContainer.querySelector(`[data-value="${next}"]`);
          if (target) target.focus();
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          const prev = Math.max(1, i - 1);
          const target = starsContainer.querySelector(`[data-value="${prev}"]`);
          if (target) target.focus();
        }
      });

      starsContainer.appendChild(s);
    }

    // pinta até n (gold) e resto cinza
    function paintStars(n) {
      const spans = starsContainer.querySelectorAll('.star');
      spans.forEach((el, idx) => {
        el.style.color = (idx < n) ? '#FFD700' : '#cccccc';
        el.setAttribute('aria-checked', (idx + 1) === currentRating ? 'true' : 'false');
      });
    }

    // define rating oficialmente
    function setRating(n) {
      currentRating = Math.max(0, Math.min(5, n));
      if (ratingHidden) ratingHidden.value = String(currentRating);
      paintStars(currentRating);
      // feedback opcional: console e aria-live (se desejar)
      console.log('Rating set to', currentRating);
      // Se quiseres mostrar um texto para o utilizador, podes descomentar:
      // showAlert(`Você avaliou este item com ${currentRating} estrela(s).`);
    }

    // inicializa a visualização
    paintStars(currentRating);
    if (ratingHidden) ratingHidden.value = String(currentRating);
  });
})();
