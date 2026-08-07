/* ============================================================
   DailyReport - shared logic (API client, helpers, logo, nav)
   ============================================================ */
(function () {
  "use strict";

  const CONFIG = window.CONFIG || { API_URL: "", LOGO_URL: "", APP_NAME: "DailyReport" };

  /* ---------- DOM helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- Date helpers ---------- */
  const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const THAI_DAYS_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

  function pad2(n) { return String(n).padStart(2, "0"); }

  function dateStr(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function todayStr() { return dateStr(new Date()); }

  function parseDate(str) {
    const parts = str.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function fmtThai(dateStrOrObj, opts) {
    const d = typeof dateStrOrObj === "string" ? parseDate(dateStrOrObj) : dateStrOrObj;
    const useShort = opts && opts.short;
    const months = useShort ? THAI_MONTHS_SHORT : THAI_MONTHS;
    const includeDay = opts && opts.day;
    const be = d.getFullYear() + 543;
    if (includeDay) {
      return d.getDate() + " " + months[d.getMonth()] + " " + be + " (" + THAI_DAYS_SHORT[d.getDay()] + ")";
    }
    return d.getDate() + " " + months[d.getMonth()] + " " + be;
  }

  function fmtThaiLong(dateStrOrObj) {
    return fmtThai(dateStrOrObj, { day: true });
  }

  /* ---------- Toast ---------- */
  function toast(message, type) {
    let wrap = $(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      wrap.setAttribute("aria-live", "polite");
      document.body.appendChild(wrap);
    }
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.setAttribute("role", "status");
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity 0.3s, transform 0.3s";
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      setTimeout(() => el.remove(), 320);
    }, 2600);
  }

  /* ---------- Logo (fetch once -> dataURL, CORS safe) ---------- */
  let logoDataURL = null;
  async function loadLogo() {
    if (logoDataURL) return logoDataURL;
    try {
      const res = await Promise.race([
        fetch(CONFIG.LOGO_URL),
        new Promise((_, reject) => setTimeout(() => reject(new Error("logo timeout")), 6000))
      ]);
      const blob = await res.blob();
      logoDataURL = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => resolve(CONFIG.LOGO_URL);
        r.readAsDataURL(blob);
      });
    } catch (e) {
      logoDataURL = CONFIG.LOGO_URL;
    }
    return logoDataURL;
  }
  function getLogo() { return logoDataURL || CONFIG.LOGO_URL; }

  /* ---------- API client (Google Apps Script) ---------- */
  const API = {
    async call(action, data) {
      if (!CONFIG.API_URL) throw new Error("ยังไม่ได้กำหนด API_URL ใน config.js");
      const res = await fetch(CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(Object.assign({ action: action }, data))
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch (e) {
        throw new Error("การตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง: " + text.slice(0, 120));
      }
      if (json.error) throw new Error(json.error);
      return json;
    },

    getSettings() { return this.call("getSettings"); },
    saveSettings(settings) { return this.call("saveSettings", { settings: settings }); },
    getCalendar(year, month) { return this.call("getCalendar", { year: year, month: month }); },
    getReport(date) { return this.call("getReport", { date: date }); },
    searchReports(query) { return this.call("searchReports", { query: query }); },
    getReportsByRange(start, end) { return this.call("getReportsByRange", { start: start, end: end }); },
    saveReport(report) { return this.call("saveReport", { report: report }); },
    deleteReport(date) { return this.call("deleteReport", { date: date }); },

    async getImage(fileId) {
      const r = await this.call("getImage", { id: fileId });
      return "data:" + r.mime + ";base64," + r.b64;
    }
  };

  /* ---------- Image compress (client side before upload) ---------- */
  function loadFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function compressImage(file) {
    const maxDim = CONFIG.IMAGE_MAX_DIM || 1600;
    const quality = CONFIG.IMAGE_QUALITY || 0.82;
    const raw = await loadFileAsDataURL(file);
    const img = await loadImage(raw);
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w <= 0 || h <= 0) return raw;
    if (w > maxDim || h > maxDim) {
      const scale = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const isPng = /image\/png/i.test(file.type);
    return canvas.toDataURL(isPng ? "image/png" : "image/jpeg", quality);
  }

  /* ---------- Misc ---------- */
  function download(dataURL, filename) {
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function setLoading(btn, loading, label) {
    if (!btn) return;
    if (loading) {
      btn.dataset.origHtml = btn.innerHTML;
      btn.classList.add("btn-loading");
      btn.innerHTML = '<span class="spinner"></span>' + (label ? " " + label : "");
    } else {
      btn.classList.remove("btn-loading");
      if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
    }
  }

  /* ---------- Concurrency-limited async map (for image loading) ---------- */
  async function mapLimit(items, limit, fn) {
    const results = new Array(items.length);
    let idx = 0;
    async function worker() {
      while (idx < items.length) {
        const i = idx++;
        try {
          results[i] = await fn(items[i], i);
        } catch (e) {
          results[i] = undefined;
        }
      }
    }
    const n = Math.max(1, Math.min(limit, items.length));
    await Promise.all(Array.from({ length: n }, worker));
    return results;
  }

  function registerSW() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(function () {});
    }
  }

  /* ---------- Page load: keep scroll position stable ----------
     Opens every page at the top so the bottom nav / content never
     appears shifted when switching tabs. */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.addEventListener("pageshow", function () { window.scrollTo(0, 0); });

  /* ---------- Export shared API ---------- */
  window.DR = {
    CONFIG: CONFIG,
    $: $,
    $$: $$,
    THAI_MONTHS: THAI_MONTHS,
    THAI_MONTHS_SHORT: THAI_MONTHS_SHORT,
    THAI_DAYS: THAI_DAYS,
    THAI_DAYS_SHORT: THAI_DAYS_SHORT,
    pad2: pad2,
    dateStr: dateStr,
    todayStr: todayStr,
    parseDate: parseDate,
    fmtThai: fmtThai,
    fmtThaiLong: fmtThaiLong,
    toast: toast,
    loadLogo: loadLogo,
    getLogo: getLogo,
    API: API,
    compressImage: compressImage,
    loadImage: loadImage,
    download: download,
    escapeHtml: escapeHtml,
    setLoading: setLoading,
    mapLimit: mapLimit,
    registerSW: registerSW
  };
})();
