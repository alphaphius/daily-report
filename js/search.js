/* Search page: find reports across items / notes, show as a deck sorted by date desc */
(function () {
  const DR = window.DR;
  const $ = DR.$;

  async function runSearch(query) {
    const q = String(query || "").trim();
    const hint = $("#results-hint");
    const results = $("#results");
    if (!q) {
      hint.classList.remove("hidden");
      results.innerHTML = "";
      return;
    }
    const btn = $("#search-btn");
    DR.setLoading(btn, true, "กำลังค้นหา...");
    try {
      const r = await DR.API.searchReports(q);
      const reports = r.reports || [];
      hint.classList.add("hidden");
      if (!reports.length) {
        results.innerHTML = '<p class="text-center text-body-md font-body-md text-on-surface-variant py-10">ไม่พบรายงานที่ตรงกับ "' + DR.escapeHtml(q) + '"</p>';
        return;
      }
      const total = reports.reduce((n, r) => n + (r.items || []).length, 0);
      results.innerHTML =
        '<p class="text-label-md font-label-md text-on-surface-variant">พบ ' + reports.length + " รายงาน (" + total + " รายการ)</p>" +
        reports.map(renderCard).join("");
    } catch (e) {
      hint.classList.add("hidden");
      results.innerHTML = '<p class="text-center text-body-md font-body-md text-error py-10">ค้นหาไม่สำเร็จ: ' + DR.escapeHtml(e.message) + "</p>";
    } finally {
      DR.setLoading(btn, false);
    }
  }

  function renderCard(r) {
    const items = r.items || [];
    const itemHtml = items.length
      ? '<ul class="mt-3 border-t border-outline-variant divide-y divide-outline-variant">' +
        items.map(function (it, i) {
          return '<li class="py-2 flex gap-3">' +
            '<span class="text-label-md font-label-md text-on-surface-variant w-6 shrink-0">' + (i + 1) + "</span>" +
            '<div class="min-w-0 flex-1">' +
            '<p class="text-body-md font-body-md">' + DR.escapeHtml(it.detail || "—") + "</p>" +
            (it.note ? '<p class="text-label-md font-label-md text-on-surface-variant mt-1">หมายเหตุ: ' + DR.escapeHtml(it.note) + "</p>" : "") +
            "</div></li>";
        }).join("") +
        "</ul>"
      : '<p class="mt-3 text-label-md font-label-md text-on-surface-variant">ไม่มีรายการ</p>';

    return '<article class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">' +
      '<div class="p-4 sm:p-5">' +
      '<div class="flex flex-wrap items-center justify-between gap-2">' +
      '<h3 class="text-headline-md font-headline-md font-bold text-primary">' + DR.fmtThaiLong(r.date) + "</h3>" +
      '<span class="text-label-md font-label-md text-on-surface-variant">' + DR.escapeHtml(r.date) + "</span>" +
      "</div>" +
      '<div class="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-label-md font-label-md text-on-surface-variant">' +
      '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">work</span> ' + DR.escapeHtml(r.workGroup || "—") + "</span>" +
      '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">location_on</span> ' + DR.escapeHtml(r.site || "—") + "</span>" +
      '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">schedule</span> ' + DR.escapeHtml(r.endTime || "—") + "</span>" +
      "</div>" +
      itemHtml +
      "</div>" +
      '<div class="px-4 sm:px-5 pb-4"><a href="preview.html?date=' + DR.escapeHtml(r.date) + '" class="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-primary text-primary rounded-full hover:bg-primary/5 transition-colors text-label-md font-label-md">' +
      '<span class="material-symbols-outlined text-sm">description</span> ดูรายงาน</a></div>' +
      "</article>";
  }

  document.addEventListener("DOMContentLoaded", () => {
    DR.registerSW();
    DR.loadLogo().then((src) => { $("#app-logo").src = src; });
    $("#search-form").addEventListener("submit", (e) => {
      e.preventDefault();
      runSearch($("#search-input").value);
    });
  });
})();
