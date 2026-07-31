(function () {
  const yearNodes = document.querySelectorAll("[data-year]");
  yearNodes.forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const root = document.documentElement;
  const themeButtons = document.querySelectorAll("[data-theme-toggle]");

  const readStoredTheme = () => {
    try {
      return window.localStorage.getItem("theme");
    } catch {
      return null;
    }
  };

  const writeStoredTheme = (theme) => {
    try {
      window.localStorage.setItem("theme", theme);
    } catch {
      // Theme still works for the current page when storage is unavailable.
    }
  };

  const preferredTheme = () => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const setTheme = (theme) => {
    root.dataset.theme = theme;
    themeButtons.forEach((button) => {
      const isDark = theme === "dark";
      button.setAttribute("aria-pressed", String(isDark));
      button.setAttribute("aria-label", isDark ? "切换浅色模式" : "切换深色模式");
      button.title = isDark ? "切换浅色模式" : "切换深色模式";
    });
  };

  setTheme(readStoredTheme() || preferredTheme());

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
      setTheme(nextTheme);
      writeStoredTheme(nextTheme);
    });
  });

  const header = document.querySelector("[data-header]");
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();
