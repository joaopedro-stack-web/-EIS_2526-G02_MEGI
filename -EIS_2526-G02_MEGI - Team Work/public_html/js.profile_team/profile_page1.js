// Handle "Change Profile Picture" button
document.addEventListener("DOMContentLoaded", () => {
  const changePhotoBtn = document.getElementById("changePhotoBtn");
  const photoInput = document.getElementById("photoInput");
  const profileImage = document.getElementById("profileImage");

  // When user clicks "Change Profile Picture", open file selector
  changePhotoBtn.addEventListener("click", () => {
    photoInput.click();
  });

  // When a new image is chosen, display it immediately
  photoInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        profileImage.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
});

