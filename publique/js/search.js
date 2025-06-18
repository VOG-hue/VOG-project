document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector(".search-bar");
  const resultsBox = document.getElementById("search-results");

  input.addEventListener("input", async () => {
    const query = input.value.trim();

    if (query.length === 0) {
      resultsBox.innerHTML = "";
      resultsBox.classList.remove("active");
      return;
    }

    try {
      const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.length > 0) {
        resultsBox.innerHTML = data.map(anime => `
          <a href="/anime/${anime.id}" class="search-result-item">
            <img src="${anime.cover}" alt="${anime.title}" class="cover-thumbnail">
            <span>${anime.title}</span>
          </a>
        `).join("");
      } else {
        resultsBox.innerHTML = "<p class='no-results'>Aucun résultat</p>";
      }

      // ✅ On affiche après avoir rempli
      resultsBox.classList.add("active");
    } catch (err) {
      console.error("Erreur recherche :", err);
      resultsBox.innerHTML = "<p class='no-results'>Erreur serveur</p>";
      resultsBox.classList.add("active");
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
      resultsBox.innerHTML = "";
      resultsBox.classList.remove("active");
    }
  });
});
