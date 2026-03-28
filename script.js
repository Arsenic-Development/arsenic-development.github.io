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

  const scrollIndicator = document.querySelector(".scroll-indicator");
  if (scrollIndicator) {
    scrollIndicator.addEventListener("click", (e) => {
      const targetSelector =
        scrollIndicator.getAttribute("data-target") || "#offer";
      const targetEl = document.querySelector(targetSelector);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
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

  function animateCounter(el) {
    const target = parseInt(el.getAttribute("data-target"), 10) || 0;
    if (target === 0) return;

    const duration = 1800;
    const start = 0;
    const startTime = performance.now();

    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(start + (target - start) * eased);

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
      .catch((err) => {
        memberCountEl.setAttribute("data-target", "1240");
      });
  }

  const canvas = document.getElementById("pixel-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d", { alpha: true });
    let width = 0,
      height = 0;
    let particles = [];
    const gridSize = 6;
    let shootingStar = null;
    let animationFrame = null;

    class PixelParticle {
      constructor() {
        this.reset();
      }
      reset() {
        const gx = Math.floor(Math.random() * (width / gridSize)) * gridSize;
        const gy = Math.floor(Math.random() * (height / gridSize)) * gridSize;
        this.x = gx;
        this.y = gy;
        this.size = Math.random() > 0.8 ? gridSize : gridSize - 2;
        this.alpha = 0;
        this.targetAlpha = Math.random() * 0.5 + 0.2;
        this.fadeSpeed = Math.random() * 0.012 + 0.005;
        this.state = "fadeIn";
        this.holdTime = Math.random() * 55 + 25;
        this.holdCounter = 0;
      }
      update() {
        if (this.state === "fadeIn") {
          this.alpha = Math.min(this.alpha + this.fadeSpeed, this.targetAlpha);
          if (this.alpha >= this.targetAlpha) this.state = "hold";
        } else if (this.state === "hold") {
          this.holdCounter++;
          if (this.holdCounter >= this.holdTime) this.state = "fadeOut";
        } else if (this.state === "fadeOut") {
          this.alpha = Math.max(this.alpha - this.fadeSpeed, 0);
          if (this.alpha <= 0) this.reset();
        }
      }
      draw() {
        ctx.fillStyle = `rgba(230, 57, 70, ${this.alpha * 0.75})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
      }
    }

    class ShootingStar {
      constructor() {
        this.reset();
      }
      reset() {
        this.active = false;
        this.x = Math.random() * width * 0.7;
        this.y = Math.random() * height * 0.3;
        this.len = Math.random() * 200 + 200;
        this.speed = Math.random() * 7 + 10;
        this.angle = Math.PI / 4;
        this.opacity = 0;
      }
      spawn() {
        this.reset();
        this.active = true;
      }
      update() {
        if (!this.active) return;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.opacity = Math.max(0, 1 - (this.y / height) * 1.5);
        if (this.x > width + this.len || this.y > height + this.len)
          this.active = false;
      }
      draw() {
        if (!this.active) return;
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(230, 57, 70, ${this.opacity * 0.5})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
          this.x - Math.cos(this.angle) * this.len,
          this.y - Math.sin(this.angle) * this.len,
        );
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < 80; i++) {
        const p = new PixelParticle();
        p.alpha = Math.random() * p.targetAlpha;
        p.state = Math.random() > 0.5 ? "fadeIn" : "fadeOut";
        particles.push(p);
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      if (shootingStar) {
        shootingStar.update();
        shootingStar.draw();
      }
      animationFrame = requestAnimationFrame(animate);
    }

    resizeCanvas();
    window.addEventListener(
      "resize",
      () => {
        resizeCanvas();
        initParticles();
      },
      { passive: true },
    );

    shootingStar = new ShootingStar();
    initParticles();

    const spawnStar = () => {
      if (shootingStar && !shootingStar.active) {
        shootingStar.spawn();
      }
      setTimeout(spawnStar, Math.random() * 10000 + 8000);
    };

    setTimeout(spawnStar, 4000);
    animate();

    window.addEventListener("beforeunload", () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    });
  }
});
