/* =========================================================
   app.js (FINAL CLEAN)
   - Prevent flicker: hide page until partials load
   - HTML partial includes
   - Mobile nav (hamburger only)
   - Footer year
   - Hero carousel (assets/data/photos.json)
   - Language segmented toggle
   - Back to top (ultra robust)
   - FormSubmit (AJAX, inline flash, phone validation) for any form[data-ajax="true"]
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
  ========================= */
  function initNav() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const menu = document.querySelector("#navMenu");
    if (!toggle || !menu) return;

    const closeMobileMenu = () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 980px)").matches) closeMobileMenu();
    });

    document.addEventListener("click", (e) => {
      if (!menu.classList.contains("is-open")) return;
      const header = document.querySelector(".site-header");
      if (header && !header.contains(e.target)) closeMobileMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMobileMenu();
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

    const saved = (localStorage.getItem("gvm_lang") || "en").toLowerCase();
    setActiveUI(saved);

    btns.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const lang = (btn.getAttribute("data-lang") || "en").toLowerCase();
        setActiveUI(lang);

        if (window.GVM_I18N && typeof window.GVM_I18N.setLang === "function") {
          await window.GVM_I18N.setLang(lang);
        } else {
          localStorage.setItem("gvm_lang", lang);
          if (lang === "en") location.reload();
        }
      });
    });
  }

  /* =========================
     Back to top (ULTRA ROBUST)
  ========================= */
  function initBackToTop() {
    if (window.__GVM_BACKTOTOP_BOUND__) return;
    window.__GVM_BACKTOTOP_BOUND__ = true;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const behavior = prefersReduced ? "auto" : "smooth";

    const isScrollable = (el) => {
      if (!el || !(el instanceof Element)) return false;
      const s = getComputedStyle(el);
      const oy = s.overflowY;
      if (!(oy === "auto" || oy === "scroll")) return false;
      return el.scrollHeight > el.clientHeight + 2;
    };

    const scrollToTop = (el) => {
      try { el.scrollTo({ top: 0, behavior }); }
      catch { el.scrollTop = 0; }
    };

    document.addEventListener(
      "click",
      (e) => {
        const link = e.target.closest('a[data-back-to-top], a[href="#top"]');
        if (!link) return;

        e.preventDefault();
        e.stopPropagation();

        try { window.scrollTo({ top: 0, behavior }); } catch {}

        const root = document.scrollingElement || document.documentElement || document.body;
        if (root) scrollToTop(root);

        let p = link.parentElement;
        while (p && p !== document.body) {
          if (isScrollable(p)) scrollToTop(p);
          p = p.parentElement;
        }

        const all = document.querySelectorAll("*");
        for (let i = 0; i < all.length; i++) {
          const el = all[i];
          if (el.scrollTop > 0 && (isScrollable(el) || el === root)) scrollToTop(el);
        }
      },
      true
    );
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

    const jsonPath = "./assets/data/photos.json";
    try {
      const res = await fetch(jsonPath, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.photos) && data.photos.length) {
          photos = data.photos.filter(Boolean).slice(0, 6);
        }
      }
    } catch {}

    track.innerHTML = "";
    dotsWrap.innerHTML = "";

    let index = 0;
    let timer = null;

    function render() {
      track.style.transform = `translateX(${-index * 100}%)`;
      [...dotsWrap.children].forEach((d, j) => d.classList.toggle("is-active", j === index));
    }

    function goTo(i) {
      index = (i + photos.length) % photos.length;
      render();
      restart();
    }

    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

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

    root.addEventListener("mouseenter", () => { if (timer) clearInterval(timer); });
    root.addEventListener("mouseleave", restart);

    render();
    restart();
  }

  /* =========================
     FormSubmit AJAX (one source of truth)
     - Works for any form[data-ajax="true"]
     - Shows inline flash in [data-form-flash]
     - Prevents redirect by using fetch + Accept: application/json
     - Validates phone if input has data-phone OR name="phone"
  ========================= */
  function initAjaxForms() {
    function onlyDigits(str) {
      return (str || "").replace(/\D/g, "");
    }

    function isValidPhone(raw) {
      const digits = onlyDigits(raw);
      // India-friendly: 10 digits, or 12 digits starting with 91; also allow 10–15 generic if you want
      return digits.length === 10 || (digits.length === 12 && digits.startsWith("91")) || (digits.length >= 10 && digits.length <= 15);
    }

    function getFlash(form) {
      return form.querySelector("[data-form-flash]");
    }

    function setFlash(form, msg, type) {
      const flash = getFlash(form);
      if (!flash) return;
      flash.textContent = msg;
      flash.setAttribute("data-type", type); // success | error | info
      flash.classList.add("is-show");
    }

    function clearFlash(form) {
      const flash = getFlash(form);
      if (!flash) return;
      flash.textContent = "";
      flash.removeAttribute("data-type");
      flash.classList.remove("is-show");
    }

    function successMessage(form) {
      if (form.id === "enrollForm") return "✅ Inquiry submitted successfully. We will contact you within 24–48 hours.";
      if (form.id === "contactForm") return "✅ Message sent successfully. We will contact you within 24–48 hours.";
      return "✅ Submitted successfully.";
    }

    document.addEventListener("submit", async (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.getAttribute("data-ajax") !== "true") return;

      e.preventDefault();
      clearFlash(form);

      // Honeypot (_gotcha)
      const gotcha = form.querySelector('input[name="_gotcha"]');
      if (gotcha && gotcha.value.trim() !== "") return;

      // Phone validation (if field exists)
      const phoneInput =
        form.querySelector("[data-phone]") ||
        form.querySelector('input[name="phone"]') ||
        form.querySelector("#phone");

      if (phoneInput) {
        const phoneVal = (phoneInput.value || "").trim();
        if (!isValidPhone(phoneVal)) {
          setFlash(
            form,
            "❗ Please enter a valid phone number (10 digits, or +91 followed by 10 digits). Example: 9876543210 or +91 9876543210.",
            "error"
          );
          phoneInput.focus();
          return;
        }
      }

      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      let oldText = "";
      if (submitBtn) {
        submitBtn.disabled = true;
        if (submitBtn.tagName === "BUTTON") {
          oldText = submitBtn.textContent;
          submitBtn.textContent = "Submitting…";
        }
      }

      try {
        setFlash(form, "Sending…", "info");

        const res = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          form.reset();
          setFlash(form, successMessage(form), "success");
        } else {
          const txt = await res.text().catch(() => "");
          console.error("FormSubmit error:", res.status, txt);
          setFlash(form, "❗ Could not submit right now. Please try again.", "error");
        }
      } catch (err) {
        console.error(err);
        setFlash(form, "❗ Network error. Please check internet and try again.", "error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          if (submitBtn.tagName === "BUTTON") submitBtn.textContent = oldText || "Submit";
        }
      }
    });

    // Clear error when typing again
    document.addEventListener("input", (e) => {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;

      const form = el.closest?.('form[data-ajax="true"]');
      if (!form) return;

      const flash = getFlash(form);
      if (flash?.classList.contains("is-show") && flash.getAttribute("data-type") === "error") {
        clearFlash(form);
      }
    });
  }

  /* =========================
     Boot
  ========================= */
  window.addEventListener("DOMContentLoaded", async () => {
    await includePartials();

    document.documentElement.classList.remove("is-loading");
    document.documentElement.classList.add("is-ready");

    initNav();
    initYear();
    initLangToggle();
    initBackToTop();
    await initCarouselFromJSON();
    initAjaxForms();
  });
})();
