document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".header");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });

  const scrollIndicator = document.querySelector(".scroll-indicator");
  if (scrollIndicator) {
    scrollIndicator.addEventListener("click", (e) => {
      const targetSelector = scrollIndicator.getAttribute("data-target");
      if (!targetSelector) return;
      const targetEl = document.querySelector(targetSelector);
      if (!targetEl) return;
      e.preventDefault();
      targetEl.scrollIntoView({ behavior: "smooth" });
    });
  }

  const toolsDropdown = document.getElementById("tools-dropdown");
  if (toolsDropdown) {
    const toggle = toolsDropdown.querySelector(".dropdown-toggle");
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toolsDropdown.classList.toggle("active");
    });

    document.addEventListener("click", () => {
      toolsDropdown.classList.remove("active");
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

  const canvas = document.getElementById("pixel-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let width, height;
    let particles = [];
    const gridSize = 6;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }

    window.addEventListener("resize", resize);
    resize();

    class PixelParticle {
      constructor() {
        this.reset();
      }

      reset() {
        const gx = Math.floor((Math.random() * width) / gridSize) * gridSize;
        const gy = Math.floor((Math.random() * height) / gridSize) * gridSize;
        this.x = gx;
        this.y = gy;
        this.size = Math.random() > 0.85 ? gridSize : Math.max(2, gridSize - 2);
        this.alpha = 0;
        this.targetAlpha = Math.random() * 0.55 + 0.15;
        this.fadeSpeed = Math.random() * 0.01 + 0.004;
        this.state = "fadeIn";
        this.holdTime = Math.random() * 60 + 20;
        this.holdCounter = 0;
      }

      update() {
        if (this.state === "fadeIn") {
          this.alpha += this.fadeSpeed;
          if (this.alpha >= this.targetAlpha) {
            this.alpha = this.targetAlpha;
            this.state = "hold";
          }
        } else if (this.state === "hold") {
          this.holdCounter++;
          if (this.holdCounter >= this.holdTime) {
            this.state = "fadeOut";
          }
        } else if (this.state === "fadeOut") {
          this.alpha -= this.fadeSpeed;
          if (this.alpha <= 0) {
            this.reset();
          }
        }
      }

      draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
      }
    }

    class ShootingStar {
      constructor() {
        this.reset();
      }

      reset() {
        this.active = false;
        this.x = Math.random() * width;
        this.y = 0; // Spawn from top
        this.len = Math.random() * 100 + 100; // Longer (100-200)
        this.speed = Math.random() * 15 + 20; // Faster (20-35)
        this.size = 4; // Thicker
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
        this.opacity = Math.max(0, 1 - (this.y / height) * 2);

        if (this.x > width || this.y > height) {
          this.active = false;
        }
      }

      draw() {
        if (!this.active) return;
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.lineWidth = this.size;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
          this.x - Math.cos(this.angle) * this.len,
          this.y - Math.sin(this.angle) * this.len,
        );
        ctx.stroke();
      }
    }

    const shootingStar = new ShootingStar();

    function spawnShootingStar() {
      shootingStar.spawn();
      const nextSpawn = 10000;
      setTimeout(spawnShootingStar, nextSpawn);
    }

    setTimeout(spawnShootingStar, 5000);

    for (let i = 0; i < 85; i++) {
      particles.push(new PixelParticle());
      particles[i].alpha = Math.random() * particles[i].targetAlpha;
      particles[i].state = Math.random() > 0.5 ? "fadeIn" : "fadeOut";
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      shootingStar.update();
      shootingStar.draw();
      requestAnimationFrame(animate);
    }

    animate();
  }
});
