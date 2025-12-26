/* =========================================================
   app.js (FINAL + FAST GT CACHE)
   - Prevent flicker: hide page until partials load
   - HTML partial includes
   - Mobile nav (hamburger only)
   - Footer year
   - Hero carousel (assets/data/photos.json)
   - Language segmented toggle (persist across pages, NO refresh loop)
   - Google Translate speed-up:
       ✅ Instant render from sessionStorage cache (per page + lang)
       ✅ Auto-saves cache after translation completes
   - Back to top (ultra robust)
   - FormSubmit (AJAX, inline flash, phone validation) for any form[data-ajax="true"]
   - Interactive Academic Calendar (desktop 2 months, phone 1 month)
   - Gallery Lightbox (optional; if markup exists)
========================================================= */

(() => {
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
     FAST GT CACHE (main only)
     - Stores translated <main> per page+lang in sessionStorage
     - Instantly applies cached version on next visit (same tab)
  ========================= */
  const LANG_KEY = "gvm_lang";

  function getLang() {
    return (localStorage.getItem(LANG_KEY) || "en").toLowerCase();
  }

  function cacheKeyFor(lang) {
    // pathname is enough for static site
    return `gvm_gt_cache:${lang}:${location.pathname}`;
  }

  function applyCachedTranslationIfAny() {
    const lang = getLang();
    if (lang === "en") return false;

    const key = cacheKeyFor(lang);
    const cached = sessionStorage.getItem(key);
    if (!cached) return false;

    const main = document.querySelector("main");
    if (!main) return false;

    // Replace main immediately (instant render)
    main.outerHTML = cached;
    return true;
  }

  function saveTranslationCache() {
    const lang = getLang();
    if (lang === "en") return;

    const main = document.querySelector("main");
    if (!main) return;

    sessionStorage.setItem(cacheKeyFor(lang), main.outerHTML);
  }

  // Wait until GT has done something (best-effort), then cache
  async function waitAndCacheTranslation() {
    const lang = getLang();
    if (lang === "en") return;

    // Give GT some time to mutate DOM; stop early if html has "translated-ltr/rtl"
    const start = Date.now();
    const maxMs = 6000;

    await new Promise((resolve) => {
      const tick = () => {
        const cls = document.documentElement.className || "";
        const looksTranslated =
          cls.includes("translated-") ||
          document.documentElement.lang?.toLowerCase() === lang;

        if (looksTranslated) return resolve();

        if (Date.now() - start > maxMs) return resolve();
        setTimeout(tick, 250);
      };
      tick();
    });

    // Cache whatever is currently rendered
    saveTranslationCache();
  }

  /* =========================
     Language segmented toggle (persist, no loop)
     - Only calls setLang() on user click
     - Uses cache on load for speed (if lang != en)
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

    const saved = getLang();
    setActiveUI(saved);

    // Loop guard (prevents double run on mobile taps)
    const canRun = () => {
      const now = Date.now();
      const last = Number(sessionStorage.getItem("__gvm_lang_last__") || "0");
      if (now - last < 800) return false;
      sessionStorage.setItem("__gvm_lang_last__", String(now));
      return true;
    };

    btns.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();

        const lang = (btn.getAttribute("data-lang") || "en").toLowerCase();
        const current = getLang();
        if (lang === current) return;
        if (!canRun()) return;

        localStorage.setItem(LANG_KEY, lang);
        setActiveUI(lang);

        if (window.GVM_I18N && typeof window.GVM_I18N.setLang === "function") {
          try {
            await window.GVM_I18N.setLang(lang);
            // After switching lang, cache this page result too
            await waitAndCacheTranslation();
          } catch (err) {
            console.error("GVM_I18N.setLang failed:", err);
          }
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
  ========================= */
  function initAjaxForms() {
    function onlyDigits(str) {
      return (str || "").replace(/\D/g, "");
    }

    function isValidPhone(raw) {
      const digits = onlyDigits(raw);
      return (
        digits.length === 10 ||
        (digits.length === 12 && digits.startsWith("91")) ||
        (digits.length >= 10 && digits.length <= 15)
      );
    }

    function getFlash(form) {
      return form.querySelector("[data-form-flash]");
    }

    function setFlash(form, msg, type) {
      const flash = getFlash(form);
      if (!flash) return;
      flash.textContent = msg;
      flash.setAttribute("data-type", type);
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

      const gotcha = form.querySelector('input[name="_gotcha"]');
      if (gotcha && gotcha.value.trim() !== "") return;

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
     Interactive Academic Calendar
     - Desktop: 2 months, Phone: 1 month
     - Prev/Next moves by 1 month
  ========================= */
  function initAcademicCalendar() {
    const mount = document.getElementById("academicCalendar");
    if (!mount) return;

    const events = [
      { date: "2025-03-25", type: "term", title: "New session planning / orientation week (tentative)" },
      { date: "2025-04-01", type: "term", title: "Academic Session Begins (tentative)" },
      { date: "2025-04-14", type: "holiday", title: "Ambedkar Jayanti (holiday) (tentative)" },
      { date: "2025-08-15", type: "holiday", title: "Independence Day (holiday)" },
      { date: "2025-10-02", type: "holiday", title: "Gandhi Jayanti (holiday)" },
      { date: "2025-12-25", type: "holiday", title: "Christmas (holiday)" },
      { date: "2026-01-26", type: "holiday", title: "Republic Day (holiday)" },
      { date: "2026-03-14", type: "holiday", title: "Holi (holiday) (tentative)" },
      { date: "2025-06-21", type: "event", title: "International Yoga Day activities" },
      { date: "2025-08-10", type: "event", title: "Independence Day rehearsal week" },
      { date: "2026-01-20", type: "event", title: "Annual Day / Cultural Program week (tentative)" },
      { date: "2025-05-25", type: "ptm", title: "PTM – Progress discussion (tentative)" },
      { date: "2025-09-28", type: "ptm", title: "PTM – Half-year results discussion (tentative)" },
      { date: "2025-12-14", type: "ptm", title: "PTM – Term 2 progress (tentative)" },
      { date: "2026-03-22", type: "ptm", title: "PTM – Final results discussion (tentative)" },
      { date: "2025-06-10", type: "exam", title: "Unit Test 1 (UT-1) begins (tentative)" },
      { date: "2025-06-15", type: "exam", title: "UT-1 ends (tentative)" },
      { date: "2025-08-26", type: "exam", title: "Unit Test 2 (UT-2) begins (tentative)" },
      { date: "2025-08-31", type: "exam", title: "UT-2 ends (tentative)" },
      { date: "2025-09-16", type: "exam", title: "Half-Yearly Exams begin (tentative)" },
      { date: "2025-09-28", type: "exam", title: "Half-Yearly Exams end (tentative)" },
      { date: "2025-11-18", type: "exam", title: "Unit Test 3 (UT-3) begins (tentative)" },
      { date: "2025-11-23", type: "exam", title: "UT-3 ends (tentative)" },
      { date: "2026-02-10", type: "exam", title: "Final Exams begin (tentative)" },
      { date: "2026-02-22", type: "exam", title: "Final Exams end (tentative)" },
      { date: "2026-04-05", type: "term", title: "Session closes / preparation for next session (tentative)" },
    ];

    const map = new Map();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }

    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
    const dow = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

    const start = new Date(2025, 2, 1);
    const end = new Date(2026, 3, 1);

    const isPhone = window.matchMedia("(max-width: 480px)").matches;
    const monthsPerPage = isPhone ? 1 : 2;

    const allMonths = [];
    {
      const cur = new Date(start);
      while (cur <= end) {
        allMonths.push({ y: cur.getFullYear(), m: cur.getMonth() });
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    let tip = document.querySelector(".cal-tip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "cal-tip";
      tip.innerHTML = `<div class="cal-tip__date"></div><div class="cal-tip__list"></div>`;
      document.body.appendChild(tip);
    }

    const typeLabel = (t) => ({
      term: "Term",
      exam: "Exams",
      ptm: "PTM",
      event: "Event",
      holiday: "Holiday",
    }[t] || "Info");

    const typeClass = (t) => ({
      term: "term",
      exam: "exam",
      ptm: "ptm",
      event: "event",
      holiday: "holiday",
    }[t] || "event");

    function fmtDateKey(y, m, d) {
      const mm = String(m + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      return `${y}-${mm}-${dd}`;
    }

    function renderMonth(y, m) {
      const monthWrap = document.createElement("div");
      monthWrap.className = "cal-month";

      const head = document.createElement("div");
      head.className = "cal-month__head";
      head.innerHTML = `<div class="cal-month__title">${monthNames[m]} ${y}</div>`;
      monthWrap.appendChild(head);

      const grid = document.createElement("div");
      grid.className = "cal-grid";

      const dowRow = document.createElement("div");
      dowRow.className = "cal-dow";
      dowRow.innerHTML = dow.map(d => `<span>${d}</span>`).join("");
      grid.appendChild(dowRow);

      const days = document.createElement("div");
      days.className = "cal-days";

      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      const totalDays = last.getDate();
      const firstDow = (first.getDay() + 6) % 7;

      for (let i = 0; i < firstDow; i++) {
        const empty = document.createElement("div");
        empty.className = "cal-day is-empty";
        days.appendChild(empty);
      }

      for (let d = 1; d <= totalDays; d++) {
        const key = fmtDateKey(y, m, d);
        const evs = map.get(key) || [];

        const cell = document.createElement("div");
        cell.className = "cal-day";
        cell.tabIndex = 0;
        cell.innerHTML = `<div class="cal-day__num">${d}</div>`;

        if (evs.length) {
          cell.classList.add("has-events");

          const badges = document.createElement("div");
          badges.className = "cal-badges";

          const uniq = [...new Set(evs.map(e => e.type))].slice(0, 4);
          uniq.forEach((t) => {
            const dot = document.createElement("span");
            dot.className = `cal-dot cal-dot--${typeClass(t)}`;
            badges.appendChild(dot);
          });

          cell.appendChild(badges);

          const showTip = (clientX, clientY) => {
            tip.querySelector(".cal-tip__date").textContent = `${d} ${monthNames[m]} ${y}`;
            tip.querySelector(".cal-tip__list").innerHTML = evs.map((e) => `
              <div class="cal-tip__item">
                <span class="cal-tip__tag">
                  <span class="cal-tip__swatch" style="background: var(--cal-${typeClass(e.type)});"></span>
                  ${typeLabel(e.type)}:
                </span>
                ${e.title}
              </div>
            `).join("");

            const pad = 14;
            tip.classList.add("is-show");

            const tw = tip.offsetWidth;
            const th = tip.offsetHeight;

            let x = clientX + pad;
            let yPos = clientY + pad;

            if (x + tw > window.innerWidth - 10) x = clientX - tw - pad;
            if (yPos + th > window.innerHeight - 10) yPos = clientY - th - pad;

            tip.style.left = `${Math.max(10, x)}px`;
            tip.style.top = `${Math.max(10, yPos)}px`;
          };

          const hideTip = () => tip.classList.remove("is-show");

          cell.addEventListener("mousemove", (e) => showTip(e.clientX, e.clientY));
          cell.addEventListener("mouseleave", hideTip);

          cell.addEventListener("focus", () => {
            const r = cell.getBoundingClientRect();
            showTip(r.left + r.width / 2, r.top + r.height / 2);
          });
          cell.addEventListener("blur", hideTip);

          cell.addEventListener("click", (e) => {
            if (tip.classList.contains("is-show")) hideTip();
            else showTip(e.clientX || 20, e.clientY || 20);
          });
        }

        days.appendChild(cell);
      }

      grid.appendChild(days);
      monthWrap.appendChild(grid);
      return monthWrap;
    }

    // page = start month index
    let page = 0;
    {
      const now = new Date();
      const idx = allMonths.findIndex(({ y, m }) => y === now.getFullYear() && m === now.getMonth());
      const maxStart = Math.max(0, allMonths.length - monthsPerPage);

      if (idx !== -1) page = Math.min(idx, maxStart);
      else {
        const rangeStart = new Date(allMonths[0].y, allMonths[0].m, 1);
        page = now < rangeStart ? 0 : maxStart;
      }
    }

    function renderPage() {
      mount.innerHTML = "";

      const slice = allMonths.slice(page, page + monthsPerPage);
      slice.forEach(({ y, m }) => mount.appendChild(renderMonth(y, m)));

      const rangeEl = document.querySelector("[data-cal-range]");
      if (rangeEl && slice.length) {
        if (monthsPerPage === 1) {
          rangeEl.textContent = `${monthNames[slice[0].m]} ${slice[0].y}`;
        } else {
          const a = slice[0];
          const b = slice[slice.length - 1];
          rangeEl.textContent = `${monthNames[a.m]} ${a.y} – ${monthNames[b.m]} ${b.y}`;
        }
      }

      const prevBtn = document.querySelector("[data-cal-prev]");
      const nextBtn = document.querySelector("[data-cal-next]");
      const maxStart = Math.max(0, allMonths.length - monthsPerPage);

      if (prevBtn) prevBtn.disabled = page === 0;
      if (nextBtn) nextBtn.disabled = page >= maxStart;
    }

    document.querySelector("[data-cal-prev]")?.addEventListener("click", () => {
      page = Math.max(0, page - 1);
      renderPage();
    });

    document.querySelector("[data-cal-next]")?.addEventListener("click", () => {
      const maxStart = Math.max(0, allMonths.length - monthsPerPage);
      page = Math.min(maxStart, page + 1);
      renderPage();
    });

    document.addEventListener("click", (e) => {
      const inside = e.target.closest?.(".cal-month, .cal__controls, .cal__legend");
      if (!inside) tip.classList.remove("is-show");
    });

    renderPage();
  }

  /* =========================
     Gallery Lightbox (optional)
  ========================= */
  function initGalleryLightbox() {
    const lb = document.querySelector("[data-lightbox]");
    if (!lb) return;

    const img = lb.querySelector(".lightbox__img");
    const cap = lb.querySelector(".lightbox__cap");
    const closeBtn = lb.querySelector(".lightbox__close");

    const open = (src, caption) => {
      img.src = src;
      img.alt = caption || "Gallery image";
      cap.textContent = caption || "";
      lb.hidden = false;
      document.body.style.overflow = "hidden";
    };

    const close = () => {
      lb.hidden = true;
      img.src = "";
      cap.textContent = "";
      document.body.style.overflow = "";
    };

    document.addEventListener("click", (e) => {
      const a = e.target.closest(".gallery-item");
      if (!a) return;

      e.preventDefault();
      open(a.getAttribute("href"), a.getAttribute("data-caption") || "");
    });

    closeBtn?.addEventListener("click", close);
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => { if (!lb.hidden && e.key === "Escape") close(); });
  }

  /* =========================
     Boot
  ========================= */
  window.addEventListener("DOMContentLoaded", async () => {
    await includePartials();

    // ✅ apply cached translated main immediately (if non-EN)
    applyCachedTranslationIfAny();

    document.documentElement.classList.remove("is-loading");
    document.documentElement.classList.add("is-ready");

    initNav();
    initYear();
    initLangToggle();
    initBackToTop();
    await initCarouselFromJSON();
    initAjaxForms();
    initAcademicCalendar();
    initGalleryLightbox();

    // ✅ after GT finishes on this page, cache it for next time
    // (If you are using GT for hi/mr, this makes revisits instant.)
    waitAndCacheTranslation().catch(() => {});
  });
})();
