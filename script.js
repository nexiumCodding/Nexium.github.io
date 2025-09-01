document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Portfolio dynamique
  const gallery = document.getElementById("gallery");
  if (gallery) {
    fetch("portfolio.json?v=4")
      .then(r => r.json())
      .then(items => {
        if (!Array.isArray(items) || !items.length) {
          gallery.innerHTML = '<p class="muted">Ajoute des projets dans <code>assets/portfolio/</code> puis liste-les dans <code>portfolio.json</code>.</p>';
          return;
        }
        items.forEach(({src, alt}) => {
          const fig = document.createElement("figure");
          fig.className = "card glass hover-up with-contours --soft";
          const img = document.createElement("img");
          img.src = src; img.alt = alt || "Projet Nexium";
          img.style.width = "100%"; img.style.display = "block";
          fig.appendChild(img);
          gallery.appendChild(fig);
        });
      })
      .catch(() => (gallery.innerHTML = "<p>Impossible de charger le portfolio.</p>"));
  }

  // Copie IP (serveurs)
  document.querySelectorAll(".copy-ip").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      const ip = btn.closest(".card")?.querySelector(".ip")?.textContent?.trim();
      if (ip) {
        navigator.clipboard.writeText(ip);
        const prev = btn.textContent;
        btn.textContent = "IP copiée ✓";
        setTimeout(() => (btn.textContent = prev), 1400);
      }
    });
  });
});
