document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Gallerie portfolio (depuis portfolio.json)
  const gallery = document.getElementById("gallery");
  if (gallery) {
    fetch("portfolio.json")
      .then(r => r.json())
      .then(items => {
        if (!Array.isArray(items) || !items.length) {
          gallery.innerHTML = '<p class="muted">Ajoute des éléments dans <code>portfolio.json</code>.</p>';
          return;
        }
        items.forEach(({src, alt}) => {
          const fig = document.createElement("figure");
          fig.className = "card";
          const img = document.createElement("img");
          img.src = src; img.alt = alt || "Projet Nexium";
          img.style.width = "100%";
          img.style.display = "block";
          fig.appendChild(img);
          gallery.appendChild(fig);
        });
      })
      .catch(() => {
        gallery.innerHTML = "<p>Erreur de chargement du portfolio.</p>";
      });
  }

  // Petites actions — copier IP (facultatif si tu veux)
  document.querySelectorAll("a.btn-nexium").forEach(btn => {
    if (btn.textContent.toLowerCase().includes("copier l’ip")) {
      btn.addEventListener("click", e => {
        e.preventDefault();
        const ip = btn.closest(".card")?.querySelector("strong")?.nextSibling?.textContent?.trim() || "";
        if (ip) navigator.clipboard.writeText(ip);
        btn.textContent = "IP copiée ✓";
        setTimeout(() => (btn.textContent = "Copier l’IP"), 1500);
      });
    }
  });
});
