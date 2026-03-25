document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  setTimeout(() => {
    loader.style.opacity = "0";
    setTimeout(() => {
      loader.style.display = "none";
    }, 500);
  }, 1000);

  const header = document.querySelector(".header");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });

  const mobileToggle = document.querySelector(".mobile-toggle");
  const navMenu = document.querySelector(".nav-menu");

  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active");
      const icon = mobileToggle.querySelector("i");
      if (navMenu.classList.contains("active")) {
        icon.classList.remove("fa-bars");
        icon.classList.add("fa-times");
      } else {
        icon.classList.remove("fa-times");
        icon.classList.add("fa-bars");
      }
    });
  }

  document.querySelectorAll(".nav-menu a").forEach((link) => {
    link.addEventListener("click", () => {
      if (navMenu) navMenu.classList.remove("active");
      if (mobileToggle) {
        mobileToggle.querySelector("i").classList.remove("fa-times");
        mobileToggle.querySelector("i").classList.add("fa-bars");
      }
    });
  });

  const themeToggle = document.getElementById("theme-toggle");
  const htmlEl = document.documentElement;
  const icon = themeToggle.querySelector("i");

  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  if (savedTheme) {
    htmlEl.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
  } else if (!systemPrefersDark) {
    htmlEl.setAttribute("data-theme", "light");
    updateThemeIcon("light");
  }

  themeToggle.addEventListener("click", () => {
    const currentTheme = htmlEl.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    htmlEl.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    if (theme === "dark") {
      icon.classList.remove("fa-moon");
      icon.classList.add("fa-sun");
    } else {
      icon.classList.remove("fa-sun");
      icon.classList.add("fa-moon");
    }
  }

  const langSelector = document.querySelector(".lang-selector");
  const langBtn = document.getElementById("lang-btn");
  const currentLangText = document.getElementById("current-lang");
  const langOptions = document.querySelectorAll(".lang-dropdown li");

  langBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    langSelector.classList.toggle("active");
  });

  document.addEventListener("click", () => {
    langSelector.classList.remove("active");
  });

  langOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const lang = option.getAttribute("data-lang");
      setLanguage(lang);
      langSelector.classList.remove("active");
    });
  });

  const savedLang = localStorage.getItem("lang");
  const initialLang = savedLang ? savedLang : "en";
  setLanguage(initialLang);

  function setLanguage(lang) {
    if (!translations[lang]) return;

    localStorage.setItem("lang", lang);
    currentLangText.textContent = lang.toUpperCase();
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (translations[lang][key]) {
        el.innerHTML = translations[lang][key];
      }
    });
  }

  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");

        if (entry.target.classList.contains("stat-item")) {
          const counter = entry.target.querySelector(".counter");
          if (counter && !counter.classList.contains("counted")) {
            animateCounter(counter);
            counter.classList.add("counted");
          }
        }
      }
    });
  }, observerOptions);

  document.querySelectorAll(".animate-on-scroll").forEach((el) => {
    observer.observe(el);
  });

  function animateCounter(el) {
    const target = parseInt(el.getAttribute("data-target"));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const updateCounter = () => {
      current += step;
      if (current < target) {
        el.textContent = Math.ceil(current);
        requestAnimationFrame(updateCounter);
      } else {
        el.textContent = target;
      }
    };

    updateCounter();
  }

  document.getElementById("current-year").textContent =
    new Date().getFullYear();

  const discordInviteCode = "BewvqAe3jb";
  fetch(
    `https://discord.com/api/v9/invites/${discordInviteCode}?with_counts=true`,
  )
    .then((response) => response.json())
    .then((data) => {
      if (data && data.approximate_member_count) {
        const memberCountEl = document.querySelector(".discord-member-count");
        if (memberCountEl) {
          memberCountEl.setAttribute(
            "data-target",
            data.approximate_member_count,
          );
          if (memberCountEl.classList.contains("counted")) {
            memberCountEl.textContent = data.approximate_member_count;
          }
        }
      }
    })
    .catch((error) => console.error("Error fetching Discord stats:", error));
});
