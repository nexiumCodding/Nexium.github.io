document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Rail social: bouton repli
  const collapse = document.querySelector(".rail-collapse");
  if (collapse) {
    collapse.addEventListener("click", () => {
      document.querySelector(".social-rail").classList.toggle("is-collapsed");
    });
  }
});
