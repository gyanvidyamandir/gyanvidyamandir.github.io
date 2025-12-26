/* =========================================================
   app.js (FINAL)
   - Prevent flicker: hide page until partials load
   - HTML partial includes
   - Mobile nav (hamburger only)
   - Footer year
   - Hero carousel (assets/data/photos.json)
   - Language segmented toggle
   - Back to top (ultra robust)
   - FormSubmit (AJAX, inline flash, phone validation) for any form[data-ajax="true"]
   - Interactive Academic Calendar (2 months view) March 2025 → April 2026
   - Gallery Lightbox (optional; if markup exists)
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
   Interactive Academic Calendar
   - March 2025 → April 2026
   - Desktop: shows current month + next month (2 months)
   - Phone: shows only current month (1 month)
   - Prev/Next moves by 1 month
========================= */
function initAcademicCalendar() {
  const mount = document.getElementById("academicCalendar");
  if (!mount) return;

  // ✅ EDIT EVENTS ANYTIME (YYYY-MM-DD)
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

  // Map events by YYYY-MM-DD
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

  // ✅ Range: March 2025 → April 2026
  const start = new Date(2025, 2, 1);
  const end = new Date(2026, 3, 1);

  // ✅ Desktop shows 2 months, phone shows 1 month
  const isPhone = window.matchMedia("(max-width: 480px)").matches;
  const monthsPerPage = isPhone ? 1 : 2;

  // Build month list
  const allMonths = [];
  {
    const cur = new Date(start);
    while (cur <= end) {
      allMonths.push({ y: cur.getFullYear(), m: cur.getMonth() });
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  // Tooltip
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
    const firstDow = (first.getDay() + 6) % 7; // Mon=0

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

  // ✅ page = start month INDEX (not page number)
  let page = 0;
  {
    const now = new Date();
    const idx = allMonths.findIndex(({ y, m }) => y === now.getFullYear() && m === now.getMonth());

    const maxStart = Math.max(0, allMonths.length - monthsPerPage);

    if (idx !== -1) {
      page = Math.min(idx, maxStart); // current month + next month
    } else {
      const rangeStart = new Date(allMonths[0].y, allMonths[0].m, 1);
      page = now < rangeStart ? 0 : maxStart;
    }
  }

  function renderPage() {
    mount.innerHTML = "";

    const startIndex = page; // ✅ month index
    const slice = allMonths.slice(startIndex, startIndex + monthsPerPage);

    slice.forEach(({ y, m }) => mount.appendChild(renderMonth(y, m)));

    const rangeEl = document.querySelector("[data-cal-range]");
    if (rangeEl && slice.length) {
  const a = slice[0];
  const b = slice[slice.length - 1];

  // ✅ Phone (1 month): show "December 2025"
  if (monthsPerPage === 1 || (a.m === b.m && a.y === b.y)) {
    rangeEl.textContent = `${monthNames[a.m]} ${a.y}`;
  } else {
    // ✅ Desktop (2 months): show "December 2025 – January 2026"
    rangeEl.textContent = `${monthNames[a.m]} ${a.y} – ${monthNames[b.m]} ${b.y}`;
  }
}


    const prevBtn = document.querySelector("[data-cal-prev]");
    const nextBtn = document.querySelector("[data-cal-next]");
    const maxStart = Math.max(0, allMonths.length - monthsPerPage);

    if (prevBtn) prevBtn.disabled = page === 0;
    if (nextBtn) nextBtn.disabled = page >= maxStart;
  }

  // Prev/Next move by 1 month (best UX)
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
     - Only runs if [data-lightbox] exists
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
  });
})();
