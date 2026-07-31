(function () {
  const yearNodes = document.querySelectorAll("[data-year]");
  yearNodes.forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const header = document.querySelector("[data-header]");
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle("solid", window.scrollY > 24);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();
