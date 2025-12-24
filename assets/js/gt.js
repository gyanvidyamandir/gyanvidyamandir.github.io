/* =========================================================
   Google Translate helper (Hindi + Marathi)
   - Hidden mount
   - Safe loading
   - Stable language switching
   - English restore via reload (required)
========================================================= */

(() => {
  let gtLoaded = false;

  function ensureHiddenMountExists() {
    if (!document.getElementById("google_translate_element")) {
      const el = document.createElement("div");
      el.id = "google_translate_element";
      el.style.display = "none";
      document.body.appendChild(el);
    }
  }

  function loadGTScriptOnce() {
    if (gtLoaded || document.getElementById("gt-script")) return;

    const s = document.createElement("script");
    s.id = "gt-script";
    s.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.head.appendChild(s);
    gtLoaded = true;
  }

  window.googleTranslateElementInit = function () {
    // eslint-disable-next-line no-undef
    new google.translate.TranslateElement(
      {
        pageLanguage: "en",
        includedLanguages: "hi,mr",
        autoDisplay: false
      },
      "google_translate_element"
    );
  };

  function waitForGTReady(timeout = 3000) {
    return new Promise((resolve) => {
      const start = Date.now();
      (function check() {
        const combo = document.querySelector("select.goog-te-combo");
        if (combo) return resolve(true);
        if (Date.now() - start > timeout) return resolve(false);
        setTimeout(check, 100);
      })();
    });
  }

  function setGTCombo(lang) {
    const combo = document.querySelector("select.goog-te-combo");
    if (!combo) return false;

    if (combo.value === lang) return true;

    combo.value = lang;
    combo.dispatchEvent(new Event("change"));
    return true;
  }

  function clearLangCookie() {
    document.cookie = "googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    document.cookie = `googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${location.hostname}`;
    document.cookie = "googtrans=/en/en;path=/";
    document.cookie = `googtrans=/en/en;path=/;domain=${location.hostname}`;
  }

  window.GVM_GT = {
    translateTo: async (lang) => {
      ensureHiddenMountExists();
      loadGTScriptOnce();
      const ok = await waitForGTReady();
      if (!ok) return;

      let tries = 0;
      const trySet = () => {
        tries++;
        if (setGTCombo(lang)) return;
        if (tries < 20) setTimeout(trySet, 120);
      };
      trySet();
    },

    // 🔑 Only reliable way to restore English
    resetToEnglish: () => {
      clearLangCookie();
      document.documentElement.classList.remove(
        "translated-ltr",
        "translated-rtl"
      );
      location.reload(); // NORMAL reload (not hard refresh)
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    ensureHiddenMountExists();
    loadGTScriptOnce();
  });
})();
