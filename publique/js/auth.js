document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("auth-overlay");
  const modal = document.querySelector(".auth-modal");
  const authTitle = document.getElementById("auth-title");
  const authForm = document.getElementById("auth-form");
  const toggleMsg = document.getElementById("auth-toggle-msg");
  const loginBtn = document.querySelector(".login-btn");
  const registerBtn = document.querySelector(".register-btn");

  const loadingAnim = document.getElementById("auth-loading");
  const successAnim = document.getElementById("auth-success");
  const errorAnim = document.getElementById("auth-error");

  let isLogin = true;

  function updateModal() {
    if (!authTitle || !authForm || !toggleMsg) return;

    authTitle.textContent = isLogin ? "Connexion" : "Inscription";
    authForm.action = isLogin ? "/login" : "/register";
    toggleMsg.innerHTML = isLogin
      ? `Pas de compte ? <span id="toggle-auth" style="cursor:pointer; color:#1e90ff;">Inscription</span>`
      : `Déjà inscrit ? <span id="toggle-auth" style="cursor:pointer; color:#1e90ff;">Connexion</span>`;

    const toggleAuth = document.getElementById("toggle-auth");
    if (toggleAuth) {
      toggleAuth.onclick = () => {
        isLogin = !isLogin;
        updateModal();
      };
    }
  }

  function showModal(login = true) {
    isLogin = login;
    updateModal();
    overlay?.classList.remove("hidden");
  }

  function hideAuthModal() {
    overlay?.classList.add("hidden");
    authForm.reset();
    loadingAnim?.classList.add("hidden");
    successAnim?.classList.add("hidden");
    errorAnim?.classList.add("hidden");
    authForm.style.display = "block";
    authTitle.style.display = "block";
    toggleMsg.style.display = "block";
  }

  loginBtn?.addEventListener("click", () => showModal(true));
  registerBtn?.addEventListener("click", () => showModal(false));

  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) {
      hideAuthModal();
    }
  });

  authForm?.addEventListener("submit", async function (e) {
    e.preventDefault();

    authForm.style.display = "none";
    authTitle.style.display = "none";
    toggleMsg.style.display = "none";
    loadingAnim?.classList.remove("hidden");

    const formData = new FormData(authForm);
    let res;

    try {
      res = await fetch(authForm.action, {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      console.error("Erreur réseau :", err);
      showError();
      return;
    }

    loadingAnim.classList.add("hidden");

    if (res.ok) {
      successAnim?.classList.remove("hidden");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } else {
      showError();
    }
  });

  function showError() {
    authForm.style.display = "block";
    authTitle.style.display = "block";
    toggleMsg.style.display = "block";
    errorAnim?.classList.remove("hidden");
    modal?.classList.add("shake");

    setTimeout(() => {
      errorAnim?.classList.add("hidden");
      modal?.classList.remove("shake");
    }, 1000);

    function validateProfilePicture(input) {
  const file = input.files[0];
  if (!file) return;

  const img = new Image();
  img.src = URL.createObjectURL(file);
  img.onload = () => {
    if (img.width > 500 || img.height > 500) {
      alert("L'image ne doit pas dépasser 500x500 pixels.");
      input.value = "";
    }
  };
}

  }
});
