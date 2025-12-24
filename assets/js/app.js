/* =========================================================
   app.js (FINAL)
   - Prevent flicker: hide page until partials load
   - HTML partial includes
   - Mobile nav (hamburger only)
   - Desktop dropdowns via CSS hover (no JS interference)
   - Footer year
   - Hero carousel (from assets/data/photos.json)
   - Language segmented toggle (safe init after partials load)
   NOTE: Formspree + flash messages are handled in assets/js/forms.js
========================================================= */

(() => {
  // ✅ Prevent flicker while header/footer are injected
  document.documentElement.classList.add("is-loading");

  /* =========================
     HTML partial includes
  ========================= */
  async function includePartials() {
    const nodes = document.querySelectorAll("[data-include]");
    await Promise.all(
      [...nodes].map(async (node) => {
        const path = node.getAttribute("data-include");
        const res = await fetch(path, { cache: "no-cache" });
        node.outerHTML = await res.text();
      })
    );
  }

  /* =========================
     Mobile nav only
     (Dropdowns on desktop are CSS hover)
  ========================= */
  function initNav() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const menu = document.querySelector("#navMenu");
    if (!toggle || !menu) return;

    const closeMobileMenu = () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    // Toggle mobile menu
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    // Close mobile menu on resize to desktop
    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 980px)").matches) {
        closeMobileMenu();
      }
    });

    // Close on click outside (mobile menu)
    document.addEventListener("click", (e) => {
      if (!menu.classList.contains("is-open")) return;

      const header = document.querySelector(".site-header");
      const clickedInsideHeader = header && header.contains(e.target);
      if (!clickedInsideHeader) closeMobileMenu();
    });

    // ESC closes mobile menu
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      closeMobileMenu();
    });
  }

  /* =========================
     Footer year
  ========================= */
  function initYear() {
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* =========================
   Language segmented toggle
   - works with i18n.js (window.GVM_I18N)
   - runs AFTER partials load
========================= */
  function initLangToggle() {
    const btns = document.querySelectorAll(".lang-seg__btn");
    if (!btns.length) return;

    const setActiveUI = (lang) => {
      btns.forEach((b) => {
        const isActive = (b.getAttribute("data-lang") || "").toLowerCase() === lang;
        b.classList.toggle("is-active", isActive);
        b.setAttribute("aria-selected", String(isActive));
      });
    };

    // initial active state (from storage)
    const saved = (localStorage.getItem("gvm_lang") || "en").toLowerCase();
    setActiveUI(saved);

    btns.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const lang = (btn.getAttribute("data-lang") || "en").toLowerCase();

        // UI highlight immediately
        setActiveUI(lang);

        // ✅ call your i18n controller
        if (window.GVM_I18N && typeof window.GVM_I18N.setLang === "function") {
          await window.GVM_I18N.setLang(lang);
        } else {
          // fallback: at least persist
          localStorage.setItem("gvm_lang", lang);
          // if EN, safest restore is a reload (optional)
          if (lang === "en") location.reload();
        }
      });
    });
  }


  /* =========================
     Carousel (assets/data/photos.json)
  ========================= */
  async function initCarouselFromJSON() {
    const root = document.querySelector("[data-carousel]");
    if (!root) return;

    const track = root.querySelector("[data-carousel-track]");
    const dotsWrap = root.querySelector("[data-carousel-dots]");
    const btnPrev = root.querySelector("[data-carousel-prev]");
    const btnNext = root.querySelector("[data-carousel-next]");
    if (!track || !dotsWrap) return;

    const fallback = ["assets/img/hero.jpg", "assets/img/announcement.jpg"];
    let photos = fallback;

    // Safer relative path (works from any page)
    const jsonPath = "./assets/data/photos.json";

    try {
      const res = await fetch(jsonPath, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.photos) && data.photos.length) {
          photos = data.photos.filter(Boolean).slice(0, 6);
        }
      }
    } catch (_) {
      // keep fallback
    }

    // Build slides
    track.innerHTML = "";
    dotsWrap.innerHTML = "";

    let index = 0;
    let timer = null;

    function render() {
      track.style.transform = `translateX(${-index * 100}%)`;
      [...dotsWrap.children].forEach((d, j) =>
        d.classList.toggle("is-active", j === index)
      );
    }

    function goTo(i) {
      index = (i + photos.length) % photos.length;
      render();
      restart();
    }

    function next() {
      goTo(index + 1);
    }
    function prev() {
      goTo(index - 1);
    }

    function restart() {
      if (timer) clearInterval(timer);
      timer = setInterval(next, 4500);
    }

    photos.forEach((url, i) => {
      const slide = document.createElement("div");
      slide.className = "carousel__slide";
      slide.style.backgroundImage = `url("${url}")`;
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-label", `Photo ${i + 1} of ${photos.length}`);
      track.appendChild(slide);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", `Go to photo ${i + 1}`);
      dot.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(dot);
    });

    btnNext?.addEventListener("click", next);
    btnPrev?.addEventListener("click", prev);

    // Pause on hover (desktop)
    root.addEventListener("mouseenter", () => {
      if (timer) clearInterval(timer);
    });
    root.addEventListener("mouseleave", restart);

    render();
    restart();
  }

  /* =========================
     Boot
  ========================= */
  window.addEventListener("DOMContentLoaded", async () => {
    // Load header/footer first
    await includePartials();

    // ✅ Show page only after partials are injected (prevents flicker)
    document.documentElement.classList.remove("is-loading");
    document.documentElement.classList.add("is-ready");

    // Init after DOM is stable
    initNav();
    initYear();
    initLangToggle();
    await initCarouselFromJSON();
    // Forms are handled in assets/js/forms.js
  });
})();
