document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  const gallery = document.getElementById("gallery");
  if (gallery) {
    fetch("portfolio.json?v=2")
      .then(r => r.json())
      .then(items => {
        if (!items.length) {
          gallery.innerHTML = "<p>Aucun projet pour l’instant.</p>";
          return;
        }
        items.forEach(({src, alt}) => {
          const fig = document.createElement("figure");
          fig.className = "card";
          const img = document.createElement("img");
          img.src = src;
          img.alt = alt || "Projet Nexium";
          img.style.width = "100%";
          fig.appendChild(img);
          gallery.appendChild(fig);
        });
      });
  }
});
