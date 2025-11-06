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
