/* =========================================================
   forms.js — Formspree submit + descriptive flash messages
   - For any form with class .js-form
   - Uses your existing flash CSS (.flash__title/.flash__msg/.flash__bar)
   - Success: descriptive + reference id + timestamp + clears form
   - Error: validation + endpoint missing + network errors
========================================================= */

(() => {
  const FLASH_WRAP_SEL = ".flash-wrap";
  const FORM_SEL = "form.js-form";

  const flashWrap = () => document.querySelector(FLASH_WRAP_SEL);

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showFlash({ type = "success", title = "Success", msg = "", ttl = 2000 } = {}) {
    const wrap = flashWrap();
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="flash flash--${type}" role="status" aria-live="polite">
        <div class="flash__title">${escapeHtml(title)}</div>
        <div class="flash__msg">${escapeHtml(msg)}</div>
        <div class="flash__bar" aria-hidden="true"></div>
      </div>
    `;

    window.setTimeout(() => { wrap.innerHTML = ""; }, ttl);
  }

  function setSubmitting(form, isSubmitting) {
    const btn = form.querySelector("[data-submit]");
    if (!btn) return;

    if (isSubmitting) {
      btn.dataset.originalText = btn.textContent.trim();
      btn.disabled = true;
      btn.textContent = "Submitting…";
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || "Submit";
    }
  }

  function makeRefId() {
    return (
      "GVM-" +
      Math.random().toString(36).slice(2, 6).toUpperCase() +
      "-" +
      Date.now().toString().slice(-4)
    );
  }

  function formDisplayName(form) {
    return (
      form.getAttribute("data-form-name") ||
      form.querySelector("input[name='formType']")?.value ||
      "Form"
    );
  }

  function validateForm(form) {
  // Native HTML5 validation first
  if (!form.checkValidity()) {
    const firstInvalid = form.querySelector(":invalid");
    firstInvalid?.focus({ preventScroll: false });

    let msg = "Please review the highlighted fields.";
    if (firstInvalid?.type === "email") {
      msg = "Please enter a valid email address.";
    }

    return { ok: false, msg };
  }

  // Trim + check required text inputs
  const required = [...form.querySelectorAll("[required]")];
  for (const el of required) {
    if (
      (el.tagName === "INPUT" || el.tagName === "TEXTAREA") &&
      typeof el.value === "string" &&
      !el.value.trim()
    ) {
      el.focus();
      const label = el.getAttribute("placeholder") || el.name || "a required field";
      return { ok: false, msg: `Please fill ${label}.` };
    }
  }

  // ✅ PHONE NUMBER VALIDATION (Enroll form)
  const phoneInput = form.querySelector("input[name='phone']");
  if (phoneInput) {
    const phone = phoneInput.value.trim();

    if (!isValidPhone(phone)) {
      phoneInput.focus();
      return {
        ok: false,
        msg: "Please enter a valid phone number (10–15 digits, numbers only)."
      };
    }
  }

  return { ok: true };
}


  
  function normalizePhone(value) {
  return value.replace(/[^\d+]/g, "");
}

function isValidPhone(value) {
  const cleaned = normalizePhone(value);

  // Allow optional +country code, total digits 10–15
  const digitsOnly = cleaned.replace(/\D/g, "");
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}


  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;

    const endpoint = form.getAttribute("data-endpoint");
    const subject = form.getAttribute("data-subject") || "";
    const name = formDisplayName(form);

    if (!endpoint || endpoint.includes("/f/XXXXX")) {
      showFlash({
        type: "error",
        title: `${name}: Setup needed`,
        msg: "Missing Formspree endpoint. Add your /f/xxxx link in data-endpoint.",
        ttl: 3500,
      });
      return;
    }

    const v = validateForm(form);
    if (!v.ok) {
      showFlash({
        type: "error",
        title: `${name}: Please review`,
        msg: v.msg,
        ttl: 3000,
      });
      return;
    }

    setSubmitting(form, true);

    const refId = makeRefId();
    const now = new Date();
    const prettyTime = now.toLocaleString();

    try {
      const fd = new FormData(form);

      if (subject && !fd.get("_subject")) fd.set("_subject", subject);
      if (!fd.get("refId")) fd.set("refId", refId);
      if (!fd.get("submittedAt")) fd.set("submittedAt", now.toISOString());

      const res = await fetch(endpoint, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
  showFlash({
    type: "success",
    title: `${name}: Submitted ✅`,
    msg: `We received your enquiry. Ref: ${refId}. Our team will contact you soon. (${prettyTime})`,
    ttl: 2200,
  });
  form.reset();
} else {
        let msg = "Please try again in a moment.";
        try {
          const data = await res.json();
          if (data?.errors?.length) msg = data.errors.map((x) => x.message).join(" ");
        } catch (_) {}

        showFlash({
          type: "error",
          title: `${name}: Could not submit`,
          msg,
          ttl: 3500,
        });
      }
    } catch (_) {
      showFlash({
        type: "error",
        title: `${name}: Network error`,
        msg: "Please check your internet connection and try again.",
        ttl: 3500,
      });
    } finally {
      setSubmitting(form, false);
    }
  }

  function init() {
    document.querySelectorAll(FORM_SEL).forEach((form) => {
      if (form.dataset.bound === "1") return;
      form.dataset.bound = "1";
      form.addEventListener("submit", onSubmit);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
