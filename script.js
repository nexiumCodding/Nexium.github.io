document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Charger la galerie depuis portfolio.json
  const gallery = document.getElementById("gallery");
  if (gallery) {
    fetch("portfolio.json")
      .then(r => r.json())
      .then(images => {
        images.forEach(img => {
          const fig = document.createElement("figure");
          fig.className = "card glass";
          const i = document.createElement("img");
          i.src = img.src;
          i.alt = img.alt;
          fig.appendChild(i);
          gallery.appendChild(fig);
        });
      })
      .catch(err => {
        gallery.innerHTML = "<p>Erreur de chargement du portfolio.</p>";
        console.error(err);
      });
  }
});
