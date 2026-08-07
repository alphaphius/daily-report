/* Reports page: browse all reports sorted by date (paginated by day windows) + optional search */
(function () {
  const DR = window.DR;
  const $ = DR.$;

  const state = {
    pageSize: 15,       // 10 / 15 / 30 days per window
    pageIndex: 0,       // 0 = most recent window
    searchMode: false
  };

  const IDS = {
    rangeCard: "#range-card",
    size: "#page-size",
    prev: "#page-prev",
    next: "#page-next",
    label: "#page-label",
    form: "#search-form",
    input: "#search-input",
    btn: "#search-btn",
    hint: "#results-hint",
    results: "#results"
  };

  function shift(str, days) {
    const d = DR.parseDate(str);
    d.setDate(d.getDate() + days);
    return DR.dateStr(d);
  }

  function windowDates() {
    const end = shift(DR.todayStr(), -state.pageIndex * state.pageSize);
    const start = shift(end, -(state.pageSize - 1));
    return { start: start, end: end };
  }

  function fmtRange(start, end) {
    if (start === end) return DR.fmtThai(start, { day: true });
    return DR.fmtThai(start) + " – " + DR.fmtThai(end, { day: true });
  }

  async function loadWindow() {
    const { start, end } = windowDates();
    $(IDS.label).textContent = fmtRange(start, end);
    $(IDS.prev).disabled = state.pageIndex === 0;
    $(IDS.hint).classList.add("hidden");
    const results = $(IDS.results);
    results.innerHTML =
      '<div class="flex items-center justify-center gap-3 py-10 text-on-surface-variant"><div class="spinner"></div><span class="text-label-md font-label-md">กำลังโหลดรายงาน...</span></div>';
    try {
      const r = await DR.API.getReportsByRange(start, end);
      const reports = r.reports || [];
      if (!reports.length) {
        results.innerHTML =
          '<p class="text-center text-body-md font-body-md text-on-surface-variant py-10">ไม่มีรายงานในช่วงวันที่นี้</p>' +
          (state.pageIndex > 0 ? '<p class="text-center text-label-md font-label-md text-on-surface-variant pb-6">กดปุ่มลูกศรขวา "ช่วงถัดไป" เพื่อดูช่วงวันที่ที่เก่ากว่าอีก</p>' : "");
        return;
      }
      const total = reports.reduce((n, x) => n + (x.items || []).length, 0);
      results.innerHTML =
        '<p class="text-label-md font-label-md text-on-surface-variant">พบ ' + reports.length + " รายงาน (" + total + " รายการ)</p>" +
        reports.map(renderCard).join("");
    } catch (e) {
      results.innerHTML =
        '<p class="text-center text-body-md font-body-md text-error py-10">โหลดไม่สำเร็จ: ' + DR.escapeHtml(e.message) + "</p>";
    }
  }

  async function runSearch(q) {
    state.searchMode = true;
    $(IDS.rangeCard).classList.add("hidden");
    $(IDS.hint).classList.add("hidden");
    const results = $(IDS.results);
    DR.setLoading($(IDS.btn), true, "กำลังค้นหา...");
    try {
      const r = await DR.API.searchReports(q);
      const reports = r.reports || [];
      if (!reports.length) {
        results.innerHTML =
          '<p class="text-center text-body-md font-body-md text-on-surface-variant py-10">ไม่พบรายงานที่ตรงกับ "' + DR.escapeHtml(q) + '"</p>';
        return;
      }
      const total = reports.reduce((n, x) => n + (x.items || []).length, 0);
      results.innerHTML =
        '<div class="flex flex-wrap items-center justify-between gap-2 mb-2">' +
        '<p class="text-label-md font-label-md text-on-surface-variant">ผลการค้นหา "' + DR.escapeHtml(q) + '" — ' + reports.length + " รายงาน (" + total + " รายการ)</p>" +
        '<button id="back-to-browse" type="button" class="inline-flex items-center gap-1 text-primary text-label-md font-label-md hover:underline px-2 py-1"><span class="material-symbols-outlined text-base" aria-hidden="true">arrow_back</span> กลับสู่รายการรายงาน</button>' +
        "</div>" +
        reports.map(renderCard).join("");
      $("#back-to-browse").addEventListener("click", backToBrowse);
    } catch (e) {
      results.innerHTML =
        '<p class="text-center text-body-md font-body-md text-error py-10">ค้นหาไม่สำเร็จ: ' + DR.escapeHtml(e.message) + "</p>";
    } finally {
      DR.setLoading($(IDS.btn), false);
    }
  }

  function backToBrowse() {
    state.searchMode = false;
    $(IDS.input).value = "";
    $(IDS.rangeCard).classList.remove("hidden");
    loadWindow();
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

    $("#page-size").addEventListener("change", (e) => {
      state.pageSize = Number(e.target.value);
      state.pageIndex = 0;
      loadWindow();
    });
    $("#page-prev").addEventListener("click", () => {
      if (state.pageIndex > 0) { state.pageIndex--; loadWindow(); }
    });
    $("#page-next").addEventListener("click", () => {
      state.pageIndex++;
      loadWindow();
    });
    $("#search-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const q = $("#search-input").value.trim();
      if (q) runSearch(q);
      else if (state.searchMode) backToBrowse();
    });

    loadWindow();
  });
})();
