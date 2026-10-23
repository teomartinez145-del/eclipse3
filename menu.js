/* =========================================================
   Eclipse Entertainment – Shared header behavior
   (scroll effect, mobile menu, "More" dropdown, search,
    header icons → My Eclipse, footer year)
   Used by every page of the new site
   ========================================================= */
(function () {
  const header = document.getElementById("mainHeader");
  if (!header) return;

  const DESKTOP_QUERY = "(min-width: 1024px)";   // same breakpoint as the CSS

  const menuToggle = document.getElementById("menuToggle");
  const headerMenu = document.getElementById("headerMenu");
  const dropdown = document.getElementById("moreDropdown");
  const dropdownToggle = dropdown ? dropdown.querySelector(".dropdown-toggle") : null;
  const searchInput = document.getElementById("searchInput");

  /* Header background on scroll */
  function onScroll() {
    header.classList.toggle("scrolled", window.scrollY > 20);
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile / tablet menu ---------- */
  function setMenu(open) {
    header.classList.toggle("menu-open", open);
    document.body.classList.toggle("menu-locked", open);   // stop the page scrolling behind the menu
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
  }

  function closeMenu() {
    setMenu(false);
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      setMenu(!header.classList.contains("menu-open"));
    });
  }

  // Tapping a real link inside the menu closes it
  if (headerMenu) {
    headerMenu.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link && !link.classList.contains("dropdown-toggle")) closeMenu();
    });
  }

  // Back to desktop size: close the mobile menu
  const desktop = window.matchMedia(DESKTOP_QUERY);
  const onSizeChange = (e) => { if (e.matches) closeMenu(); };
  if (desktop.addEventListener) {
    desktop.addEventListener("change", onSizeChange);
  } else if (desktop.addListener) {
    desktop.addListener(onSizeChange);   // older Safari (iOS 13 and below)
  }

  /* ---------- "More" dropdown ---------- */
  function closeDropdown() {
    if (!dropdown) return;
    dropdown.classList.remove("open");
    dropdownToggle.setAttribute("aria-expanded", "false");
  }

  if (dropdownToggle) {
    dropdownToggle.addEventListener("click", (e) => {
      e.preventDefault();
      const open = dropdown.classList.toggle("open");
      dropdownToggle.setAttribute("aria-expanded", String(open));
    });

    // Click / tap anywhere else closes it
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) closeDropdown();
    });

    // Keyboard: tabbing out of the dropdown closes it
    dropdown.addEventListener("focusout", (e) => {
      if (!dropdown.contains(e.relatedTarget)) closeDropdown();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDropdown();
      closeMenu();
    }
  });

  /* ---------- Search: Enter goes to the showtimes ---------- */
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      closeMenu();
      searchInput.blur();   // hides the phone keyboard

      const showtimes = document.getElementById("showtimes");
      if (showtimes) {
        showtimes.scrollIntoView({ behavior: "smooth" });
      } else {
        const q = searchInput.value.trim();
        window.location.href = q
          ? `index.html?search=${encodeURIComponent(q)}#showtimes`
          : "index.html#showtimes";
      }
    });
  }

  /* ---------- Header icons: Tickets and User open My Eclipse ----------
     New pages use real <a> links. Pages that still use <div> icons
     get the same behavior here, so every page works. */
  const icons = document.querySelectorAll(".user-icons .icon-wrapper");
  const iconLinks = ["my-eclipse.html#tickets", "my-eclipse.html"];

  icons.forEach((icon, i) => {
    if (icon.tagName === "A" || !iconLinks[i]) return;
    icon.setAttribute("role", "link");
    icon.tabIndex = 0;
    const go = () => { window.location.href = iconLinks[i]; };
    icon.addEventListener("click", go);
    icon.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  });

  // Signed in? Show the first name under the User icon
  try {
    const saved = JSON.parse(localStorage.getItem("eclipseAccount"));
    const label = icons[1] && icons[1].querySelector("span");
    if (saved && saved.profile && saved.profile.name && label) {
      label.textContent = saved.profile.name.split(" ")[0];
    }
  } catch (e) {
    // storage blocked (private mode): keep the default label
  }

  /* Footer year */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  onScroll();
})();