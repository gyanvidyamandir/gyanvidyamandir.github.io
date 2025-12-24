/* =========================================================
   Manual i18n (English labels) + Google Translate fallback
   - EN = original content (reload)
   - HI / MR = Google Translate
========================================================= */

(() => {
  const dict = {
    en: {
      nav: {
        about: "About Us",
        admissions: "Admissions",
        resources: "Resources",
        careers: "Careers",
        contact: "Contact Us"
      },
      home: {
        heroTitle: "Strong foundations. Confident futures."
      }
    }
  };

  const get = (obj, path) =>
    path.split(".").reduce((a, k) => (a ? a[k] : undefined), obj);

  function applyManualEN() {
    const pack = dict.en;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = get(pack, key);
      if (typeof val === "string") el.textContent = val;
    });

    document.documentElement.lang = "en";
    localStorage.setItem("gvm_lang", "en");
  }

  window.GVM_I18N = {
    setLang: async (lang) => {
      localStorage.setItem("gvm_lang", lang);

      // 🔑 English = restore original page
      if (lang === "en") {
        applyManualEN();
        if (window.GVM_GT) window.GVM_GT.resetToEnglish();
        return;
      }

      // Hindi / Marathi → Google Translate
      document.documentElement.lang = lang;
      if (window.GVM_GT) window.GVM_GT.translateTo(lang);
    },

    getLang: () => localStorage.getItem("gvm_lang") || "en"
  };

  document.addEventListener("DOMContentLoaded", () => {
    const lang = localStorage.getItem("gvm_lang") || "en";

    if (lang === "en") {
      applyManualEN();
    } else if (window.GVM_GT) {
      window.GVM_GT.translateTo(lang);
    }
  });
})();
