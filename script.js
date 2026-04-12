document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("contextmenu", (e) => e.preventDefault(), {
    capture: true,
  });
  document.addEventListener(
    "keydown",
    (e) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey &&
          e.shiftKey &&
          (e.key === "I" || e.key === "J" || e.key === "C" || e.key === "K")) ||
        (e.ctrlKey &&
          (e.key === "u" || e.key === "U" || e.key === "s" || e.key === "S"))
      ) {
        e.preventDefault();
        return false;
      }
    },
    { capture: true },
  );

  const header = document.querySelector(".header");
  if (header) {
    const handleScroll = () => {
      header.classList.toggle("scrolled", window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
  }

  const toolsDropdown = document.getElementById("tools-dropdown");
  if (toolsDropdown) {
    const toggle = toolsDropdown.querySelector(".dropdown-toggle");

    const closeDropdown = () => {
      toolsDropdown.classList.remove("active");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    };

    if (toggle) {
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isActive = toolsDropdown.classList.toggle("active");
        toggle.setAttribute("aria-expanded", isActive.toString());
      });
    }

    document.addEventListener("click", (e) => {
      if (!toolsDropdown.contains(e.target)) {
        closeDropdown();
      }
    });

    toolsDropdown.addEventListener("mouseleave", () => {
      closeDropdown();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDropdown();
    });
  }

  const observerOptions = {
    root: null,
    rootMargin: "-50px 0px -50px 0px",
    threshold: 0.15,
  };

  const observer = new IntersectionObserver((entries) => {
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

  const revealIfNearViewport = () => {
    document.querySelectorAll(".animate-on-scroll").forEach((el) => {
      if (el.classList.contains("is-visible")) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.25 && rect.bottom > -50) {
        el.classList.add("is-visible");
      }
    });
  };

  revealIfNearViewport();
  window.addEventListener("scroll", revealIfNearViewport, { passive: true });
  window.addEventListener("resize", revealIfNearViewport, { passive: true });

  function animateCounter(el) {
    const target = parseInt(el.getAttribute("data-target"), 10) || 0;
    if (target === 0) return;

    const duration = target <= 10 ? 650 : 1800;
    const start = 0;
    const startTime = performance.now();

    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(start + (target - start) * eased);

      el.textContent = currentValue.toLocaleString("en-US");

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target.toLocaleString("en-US");
      }
    };

    requestAnimationFrame(update);
  }

  const yearEl = document.getElementById("current-year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const isSkinGrabberPage =
    document.body?.classList?.contains("page-skingrabber") ?? false;

  if (isSkinGrabberPage) {
    const stop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    document.addEventListener("copy", stop, { capture: true });
    document.addEventListener("cut", stop, { capture: true });
    document.addEventListener("paste", stop, { capture: true });
    document.addEventListener("dragstart", stop, { capture: true });
    document.addEventListener("selectstart", stop, { capture: true });
  }

  const discordInviteCode = "BewvqAe3jb";
  const memberCountEl = document.querySelector(".discord-member-count");

  if (memberCountEl) {
    fetch(
      `https://discord.com/api/v10/invites/${discordInviteCode}?with_counts=true`,
    )
      .then((response) => {
        if (!response.ok) throw new Error("Discord API error");
        return response.json();
      })
      .then((data) => {
        if (data?.approximate_member_count) {
          const count = data.approximate_member_count;
          memberCountEl.setAttribute("data-target", count);
          if (
            memberCountEl
              .closest(".stat-item")
              ?.classList.contains("is-visible")
          ) {
            animateCounter(memberCountEl);
          }
        }
      })
      .catch(() => {
        memberCountEl.setAttribute("data-target", "1240");
      });
  }
});
