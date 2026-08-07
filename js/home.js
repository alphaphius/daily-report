/* Home page: calendar + selected-day summary */
(function () {
  const DR = window.DR;
  const $ = DR.$, $$ = DR.$$;

  let viewYear, viewMonth;          // month being displayed
  let selectedDate = DR.todayStr(); // YYYY-MM-DD
  let reportDates = new Set();      // dates that have a report
  let summaryReport = null;

  function init() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    renderCalendar();
    loadCalendar();
    loadSummary();

    $("#cal-prev").addEventListener("click", () => {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      renderCalendar();
      loadCalendar();
    });
    $("#cal-next").addEventListener("click", () => {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      renderCalendar();
      loadCalendar();
    });
  }

  async function loadCalendar() {
    const li = $("#cal-loading");
    if (li) li.classList.remove("hidden");
    try {
      const r = await DR.API.getCalendar(viewYear, viewMonth + 1);
      reportDates = new Set((r.dates || []).map((d) => d.date || d));
      renderCalendar();
    } catch (e) {
      DR.toast("ไม่สามารถโหลดปฏิทินได้: " + e.message, "error");
    } finally {
      if (li) li.classList.add("hidden");
    }
  }

  function renderCalendar() {
    $("#cal-title").textContent = "ปฏิทินรายเดือน (" + DR.THAI_MONTHS[viewMonth] + " " + (viewYear + 543) + ")";

    const grid = $("#cal-grid");
    let html = "";
    DR.THAI_DAYS_SHORT.forEach((d) => {
      html += '<div class="text-label-md font-label-md text-on-surface-variant py-2">' + d + "</div>";
    });

    const first = new Date(viewYear, viewMonth, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // leading cells from previous month
    const prevDays = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevDays - i;
      const cell = new Date(viewYear, viewMonth - 1, d);
      html += '<div class="p-2 text-on-surface-variant opacity-50">' + d + "</div>";
    }

    const today = DR.todayStr();
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      const ds = DR.dateStr(d);
      const isToday = ds === today;
      const isSelected = ds === selectedDate;
      const hasReport = reportDates.has(ds);
      const cls = [];
      if (isSelected) {
        cls.push("bg-primary text-on-primary font-bold");
      } else if (isToday) {
        cls.push("bg-secondary-container text-on-secondary-container font-bold");
      } else {
        cls.push("hover:bg-surface-container-high");
      }
      html += '<div class="p-2 cursor-pointer rounded-full transition-colors relative flex items-center justify-center h-10 w-10 mx-auto ' + cls.join(" ") + '" data-date="' + ds + '">' + day +
        (hasReport ? '<div class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ' + (isSelected ? "bg-on-primary" : "bg-primary") + '"></div>' : "") +
        "</div>";
    }

    // trailing cells
    const used = startDay + daysInMonth;
    const trailing = (7 - (used % 7)) % 7;
    for (let i = 1; i <= trailing; i++) {
      html += '<div class="p-2 text-on-surface-variant opacity-50">' + i + "</div>";
    }

    grid.innerHTML = html;
    $$("[data-date]", grid).forEach((el) => {
      el.addEventListener("click", () => {
        selectedDate = el.dataset.date;
        renderCalendar();
        loadSummary();
      });
    });
  }

  async function loadSummary() {
    $("#sum-title").textContent = "รายงานวันที่ " + DR.fmtThaiLong(selectedDate);
    const body = $("#sum-body");
    body.innerHTML = '<div class="spinner"></div><p class="mt-3 text-label-md font-label-md text-on-surface-variant">กำลังโหลดข้อมูล...</p>';
    try {
      const r = await DR.API.getReport(selectedDate);
      summaryReport = r.report || null;
      if (!summaryReport || !summaryReport.items) {
        summaryReport = null;
      }
      renderSummary();
      if (summaryReport) await loadSummaryImages();
    } catch (e) {
      body.innerHTML = '<p class="text-body-md font-body-md text-error">โหลดข้อมูลล้มเหลว: ' + DR.escapeHtml(e.message) + '</p>';
      DR.toast("ไม่สามารถโหลดข้อมูลได้: " + e.message, "error");
    }
  }

  function renderSummary() {
    const body = $("#sum-body");
    if (!summaryReport) {
      body.className = "flex flex-col items-center justify-center py-stack-lg text-center bg-surface-container-low rounded-lg border border-dashed border-outline-variant";
      body.innerHTML =
        '<span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">description</span>' +
        '<p class="text-body-lg font-body-lg text-on-surface-variant">รายงานวันนี้: ยังไม่ได้สร้าง</p>' +
        '<a href="create.html?date=' + selectedDate + '" class="mt-stack-md bg-secondary-container text-on-secondary-container px-6 py-2 rounded-full font-label-md text-label-md flex items-center gap-2 hover:opacity-90 transition-all">' +
        '<span class="material-symbols-outlined text-sm">add</span> สร้างรายงานใหม่</a>';
      return;
    }

    const r = summaryReport;
    const items = r.items || [];
    const imgCount = (r.images || []).length;
    body.className = "flex flex-col gap-3 w-full";
    body.innerHTML =
      '<div class="w-full grid grid-cols-2 sm:grid-cols-4 gap-3">' +
      statRow("work", "กลุ่มงาน", r.workGroup || "—") +
      statRow("location_on", "ไซต์งาน", r.site || "—") +
      statRow("schedule", "เวลาเลิกงาน", r.endTime || "—") +
      statRow("fact_check", "รายการ", items.length + " รายการ") +
      "</div>" +

      '<div class="w-full bg-white border border-outline-variant rounded-xl overflow-hidden">' +
      '<div class="overflow-x-auto w-full">' +
      '<table class="w-full text-left border-collapse">' +
      '<thead class="bg-surface-container-low border-b border-outline-variant">' +
      '<tr>' +
      '<th class="p-3 text-label-md font-label-md text-on-surface-variant w-12 text-center">ลำดับ</th>' +
      '<th class="p-3 text-label-md font-label-md text-on-surface-variant min-w-[200px]">รายละเอียด</th>' +
      '<th class="p-3 text-label-md font-label-md text-on-surface-variant min-w-[120px]">หมายเหตุ</th>' +
      "</tr></thead>" +
      '<tbody class="text-data-tabular font-data-tabular divide-y divide-outline-variant">' +
      (items.length ? items.map(function (it, i) {
        return "<tr>" +
          '<td class="p-3 text-center">' + (i + 1) + "</td>" +
          '<td class="p-3">' + DR.escapeHtml(it.detail) + "</td>" +
          '<td class="p-3">' + (it.note ? DR.escapeHtml(it.note) : "—") + "</td></tr>";
      }).join("") :
        '<tr><td colspan="3" class="p-3 text-center text-on-surface-variant">ไม่มีรายการ</td></tr>') +
      "</tbody></table></div></div>" +

      '<div id="sum-images" class="w-full flex flex-col gap-3"></div>' +

      '<div class="w-full flex flex-col sm:flex-row gap-3 justify-end mt-2">' +
      '<a href="create.html?date=' + selectedDate + '" class="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-primary text-primary rounded-full hover:bg-primary/5 transition-colors text-label-md font-label-md">' +
      '<span class="material-symbols-outlined text-sm">edit</span> แก้ไขรายงาน</a>' +
      '<a href="preview.html?date=' + selectedDate + '" class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-full hover:bg-primary-container transition-colors shadow-sm text-label-md font-label-md">' +
      '<span class="material-symbols-outlined text-sm">description</span> ดูและส่งออกรายงาน</a>' +
      "</div>";

    if (!imgCount) {
      $("#sum-images").innerHTML = "";
    }
  }

  async function loadSummaryImages() {
    const list = $("#sum-images");
    if (!list || !summaryReport) return;
    const recs = (summaryReport.images || []).slice();
    if (!recs.length) { list.innerHTML = ""; return; }
    list.innerHTML = '<div class="spinner"></div>';
    let html = "";
    for (let i = 0; i < recs.length; i++) {
      const rec = recs[i];
      try {
        const url = await DR.API.getImage(rec.fileId);
        html += '<div class="w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low">' +
          '<img src="' + url + '" class="w-full h-auto block" alt="รูป ' + (i + 1) + '" />' +
          (rec.caption ? '<div class="p-2 text-label-md font-label-md text-on-surface-variant">' + DR.escapeHtml(rec.caption) + "</div>" : "") +
          "</div>";
      } catch (e) { /* skip broken image */ }
    }
    list.innerHTML = html || '<p class="text-label-md font-label-md text-on-surface-variant">โหลดรูปไม่สำเร็จ</p>';
  }

  function statRow(icon, label, value) {
    return '<div class="flex items-center gap-3 bg-white border border-outline-variant rounded-lg px-4 py-3">' +
      '<span class="material-symbols-outlined text-primary">' + icon + "</span>" +
      '<div class="flex flex-col"><span class="text-label-md font-label-md text-on-surface-variant">' + DR.escapeHtml(label) + "</span>" +
      '<span class="text-data-tabular font-data-tabular text-on-surface font-bold">' + DR.escapeHtml(value) + "</span></div></div>";
  }

  document.addEventListener("DOMContentLoaded", () => {
    DR.registerSW();
    DR.loadLogo().then((src) => { $("#app-logo").src = src; });
    init();
  });
})();
