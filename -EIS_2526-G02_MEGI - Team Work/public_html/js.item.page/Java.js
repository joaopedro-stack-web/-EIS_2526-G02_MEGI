document.addEventListener("DOMContentLoaded", () => {

    // --------- ELEMENTS ---------
    const summaryCard = document.getElementById("summaryCard");
    const editCard = document.getElementById("editCard");
    const editBtn = document.getElementById("editBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const itemForm = document.getElementById("itemForm");

    const ratingViewStars = document.querySelectorAll("#ratingView .star");
    const ratingEditStars = document.querySelectorAll("#ratingEdit .star");
    const ratingValue = document.getElementById("ratingValue");

    // Summary elements
    const sumName = document.getElementById("sumName");
    const sumImportance = document.getElementById("sumImportance");
    const sumWeight = document.getElementById("sumWeight");
    const sumPrice = document.getElementById("sumPrice");
    const sumDate = document.getElementById("sumDate");

    // Form fields
    const fname = document.getElementById("editName");
    const fimp = document.getElementById("editImportance");
    const fweight = document.getElementById("editWeight");
    const fprice = document.getElementById("editPrice");
    const fdate = document.getElementById("editDate");

// IMAGE UPLOAD PREVIEW
    const editPhoto = document.getElementById("editPhoto");
    const itemPhotoPreview = document.getElementById("itemPhotoPreview");

    if (editPhoto) {
        editPhoto.addEventListener("change", function () {
            const file = editPhoto.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                    itemPhotoPreview.src = reader.result; // MOSTRA A NOVA IMAGEM
                };
                reader.readAsDataURL(file);
            }
        });
    }


    // --------- INITIAL DATA ---------
    let itemData = {
        name: "Luke Skywalker (1977)",
        importance: 8,
        weight: 45,
        price: 24.99,
        acquisition: "2021-08-15",
        rating: 3
    };



    // --------- SUMMARY UPDATE ---------
    function updateSummary() {
        sumName.textContent = itemData.name;
        sumImportance.textContent = itemData.importance;
        sumWeight.textContent = itemData.weight;
        sumPrice.textContent = itemData.price;
        sumDate.textContent = itemData.acquisition;
    }
    updateSummary();



    // --------- RATING VIEW MODE ---------
    function paintViewRating() {
        ratingViewStars.forEach((s, i) => {
            s.style.color = (i < itemData.rating) ? "#FFD700" : "#ccc";
        });
    }
    paintViewRating();



    // --------- RATING EDIT MODE (interactive) ---------
    ratingEditStars.forEach(star => {

        star.addEventListener("mouseover", () => {
            let val = star.dataset.value;
            ratingEditStars.forEach((s, i) => {
                s.style.color = (i < val) ? "#FFD700" : "#ccc";
            });
        });

        star.addEventListener("mouseout", () => {
            paintEditRating();
        });

        star.addEventListener("click", () => {
            itemData.rating = parseInt(star.dataset.value);
            ratingValue.value = itemData.rating;
            paintEditRating();
        });
    });

    function paintEditRating() {
        ratingEditStars.forEach((s, i) => {
            s.style.color = (i < itemData.rating) ? "#FFD700" : "#ccc";
        });
    }

    // initial paint
    paintEditRating();
    ratingValue.value = itemData.rating;



    // --------- EDIT BUTTON ---------
    editBtn.addEventListener("click", () => {
        summaryCard.style.display = "none";
        editCard.style.display = "block";

        fname.value = itemData.name;
        fimp.value = itemData.importance;
        fweight.value = itemData.weight;
        fprice.value = itemData.price;
        fdate.value = itemData.acquisition;

        paintEditRating();
    });



    // --------- CANCEL BUTTON ---------
    cancelBtn.addEventListener("click", () => {
        editCard.style.display = "none";
        summaryCard.style.display = "block";
        paintViewRating();
    });



    // --------- SAVE ---------
    itemForm.addEventListener("submit", (e) => {
        e.preventDefault();

        itemData.name = fname.value;
        itemData.importance = fimp.value;
        itemData.weight = fweight.value;
        itemData.price = fprice.value;
        itemData.acquisition = fdate.value;

        updateSummary();
        paintViewRating();

        editCard.style.display = "none";
        summaryCard.style.display = "block";
        alert("Item updated!");
    });

});
