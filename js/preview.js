/* Preview + Export page logic */
(function () {
  const DR = window.DR;
  const $ = DR.$;

  let report = null;
  let images = []; // {url, mime, w, h, caption}
  let logoDataURL = "";

  async function init() {
    const qs = new URLSearchParams(location.search);
    const date = qs.get("date") || DR.todayStr();
    if (qs.get("saved")) DR.toast("บันทึกรายงานแล้ว", "success");

    try {
      logoDataURL = await DR.loadLogo();
    } catch (e) { logoDataURL = DR.getLogo(); }

    try {
      const r = await DR.API.getReport(date);
      report = r.report;
      if (!report || !Array.isArray(report.items)) throw new Error("ไม่พบรายงานในวันนี้");
      const imgList = report.images || [];
      for (let i = 0; i < imgList.length; i++) {
        const rec = imgList[i];
        try {
          const url = await DR.API.getImage(rec.fileId);
          const imgEl = await DR.loadImage(url);
          images.push({ url: url, mime: mimeOf(url), w: imgEl.naturalWidth || 800, h: imgEl.naturalHeight || 600, caption: rec.caption || "" });
        } catch (e) {
          DR.toast("โหลดรูป " + (i + 1) + " ไม่สำเร็จ", "error");
        }
      }
      renderDoc();
      $("#loading-box").classList.add("hidden");
      $("#doc-wrap").classList.remove("hidden");

      $("#btn-image").addEventListener("click", exportImage);
      $("#btn-pdf").addEventListener("click", exportPDF);
    } catch (e) {
      $("#loading-box").innerHTML =
        '<p class="text-error font-bold mb-2">ไม่พบรายงาน</p>' +
        '<p class="text-on-surface-variant text-sm mb-4">' + DR.escapeHtml(e.message) + "</p>" +
        '<a href="create.html?date=' + date + '" class="bg-secondary-container text-on-secondary-container px-6 py-2 rounded-full font-label-md text-label-md">สร้างรายงาน</a>';
    }
  }

  function mimeOf(dataUrl) {
    const m = /^data:([^;]+);/.exec(dataUrl);
    if (!m) return "PNG";
    return m[1].indexOf("png") >= 0 ? "PNG" : "JPEG";
  }

  function renderDoc() {
    const doc = $("#report-doc");
    const C = DR.CONFIG;
    const meta = [
      ["วันที่:", DR.fmtThai(report.date)],
      ["ไซต์:", report.site || "—"],
      ["กลุ่มงาน:", report.workGroup || "—"],
      ["เวลาเลิกงาน:", report.endTime || "—"]
    ];
    const itemRows = (report.items || []).map((it, i) =>
      "<tr class='border-b border-outline-variant" + (i % 2 ? " bg-surface-bright" : "") + "'>" +
      "<td class='p-3 text-center'>" + (i + 1) + "</td>" +
      "<td class='p-3'>" + DR.escapeHtml(it.detail) + "</td>" +
      "<td class='p-3'>" + (it.note ? DR.escapeHtml(it.note) : "—") + "</td></tr>").join("");

    const imgCells = images.map((img) =>
      "<div class='relative'>" +
      "<div class='bg-cover bg-center w-full aspect-square rounded-md border border-outline-variant' style='background-image:url(" + img.url + ")'></div>" +
      (img.caption ? "<div class='absolute bottom-0 left-0 w-full bg-black/50 text-white p-2 text-xs rounded-b-md'>" + DR.escapeHtml(img.caption) + "</div>" : "") +
      "</div>").join("");

    doc.innerHTML =
      '<div class="flex flex-col md:flex-row justify-between items-start mb-8 gap-4 border-b border-outline-variant pb-6">' +
      '<div class="flex items-center gap-4">' +
      '<img src="' + logoDataURL + '" class="w-16 h-16 rounded-sm object-contain" alt="logo" />' +
      "<div><h2 class='text-2xl md:text-3xl font-bold leading-tight' style='color:#c2652a'>" + DR.escapeHtml(C.REPORT_TITLE) + "</h2>" +
      "<p class='text-sm mt-1' style='color:#605850'>" + DR.escapeHtml(report.site || "") + "</p></div></div>" +
      '<div class="text-right"><div class="grid grid-cols-2 gap-x-6 gap-y-1 text-[14px]">' +
      meta.map((m) => "<span class='text-left' style='color:#605850'>" + m[0] + "</span><span class='font-bold'>" + DR.escapeHtml(m[1]) + "</span>").join("") +
      "</div></div></div>" +

      "<h3 class='text-xl font-bold mb-3'>รายการปฏิบัติงาน</h3>" +
      '<div class="overflow-x-auto rounded-md border border-outline-variant mb-8">' +
      "<table class='w-full text-left border-collapse'>" +
      "<thead><tr class='text-sm border-b border-outline-variant' style='background:#f6f0e8;color:#605850'>" +
      "<th class='p-3 w-12'>ลำดับ</th><th class='p-3'>รายละเอียด</th><th class='p-3'>หมายเหตุ</th></tr></thead>" +
      "<tbody class='text-[14px]'>" + itemRows + "</tbody></table></div>" +

      "<h3 class='text-xl font-bold mb-3'>ภาพประกอบ</h3>" +
      (images.length ? "<div class='grid grid-cols-2 gap-4'>" + imgCells + "</div>" :
        "<p class='text-sm' style='color:#605850'>ไม่มีภาพประกอบ</p>");
  }

  /* ================= Export: PNG (บันทึกเป็นรูปภาพ) ================= */
  async function exportImage() {
    const btn = $("#btn-image");
    DR.setLoading(btn, true, "กำลังสร้างรูป...");
    try {
      await document.fonts.ready;
      const el = $("#report-doc");
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const dataUrl = canvas.toDataURL("image/png");
      DR.download(dataUrl, "DailyReport_" + report.date + ".png");
      DR.toast("บันทึกรูปภาพแล้ว", "success");
    } catch (e) {
      DR.toast("ส่งออกรูปไม่สำเร็จ: " + e.message, "error");
    } finally {
      DR.setLoading(btn, false);
    }
  }

  /* ================= Export: PDF (ส่งออกเป็น PDF) ================= */
  async function exportPDF() {
    const btn = $("#btn-pdf");
    DR.setLoading(btn, true, "กำลังสร้าง PDF...");
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      Object.keys(window.ANUphan_FONTS || {}).forEach((name) => {
        doc.addFileToVFS(name, window.SARABUN_FONTS[name]);
      });
      doc.addFont("Anuphan-Regular.ttf", "Anuphan", "normal");
      doc.addFont("Anuphan-Bold.ttf", "Anuphan", "bold");

      const M = 12, W = 210, H = 297, CW = W - 2 * M;
      const PRIMARY = [194, 101, 42], GRAY = [96, 88, 80], INK = [58, 48, 42], LINE = [216, 208, 200];
      const pad = 3, lh = 5.2;
      let y = M;

      function ensureY(h) {
        if (y + h > H - M) {
          doc.addPage();
          y = M;
          doc.setFont("Anuphan", "normal");
        }
      }
      function metaPair(label, value, lineY) {
        doc.setFont("Anuphan", "normal");
        doc.setFontSize(10);
        doc.setTextColor.apply(doc, GRAY);
        const lw = doc.getTextWidth(label);
        doc.text(label, W - M, lineY, { align: "right" });
        doc.setFont("Anuphan", "bold");
        doc.setTextColor.apply(doc, INK);
        doc.text(String(value || "—"), W - M - lw, lineY, { align: "right" });
      }

      /* header */
      try {
        doc.addImage(logoDataURL, mimeOf(logoDataURL), M, y - 1, 14, 14);
      } catch (e) { /* logo optional */ }
      doc.setFont("Anuphan", "bold");
      doc.setFontSize(15);
      doc.setTextColor.apply(doc, PRIMARY);
      doc.text(DR.CONFIG.REPORT_TITLE, M + 18, y + 4);
      doc.setFont("Anuphan", "normal");
      doc.setFontSize(10);
      doc.setTextColor.apply(doc, GRAY);
      doc.text(String(report.site || ""), M + 18, y + 9);
      let my = y + 1;
      metaPair("วันที่:", DR.fmtThai(report.date), my); my += 5.5;
      metaPair("ไซต์:", report.site, my); my += 5.5;
      metaPair("กลุ่มงาน:", report.workGroup, my); my += 5.5;
      metaPair("เวลาเลิกงาน:", report.endTime, my);
      y += 22;
      doc.setDrawColor.apply(doc, LINE);
      doc.setLineWidth(0.3);
      doc.line(M, y, W - M, y);
      y += 8;

      /* section: items */
      doc.setFont("Anuphan", "bold");
      doc.setFontSize(12);
      doc.setTextColor.apply(doc, INK);
      doc.text("รายการปฏิบัติงาน", M, y);
      y += 7;

      function drawHeader() {
        doc.setFillColor(246, 240, 232);
        doc.rect(M, y, CW, 8, "F");
        doc.setFont("Anuphan", "bold");
        doc.setFontSize(10);
        doc.setTextColor.apply(doc, INK);
        doc.text("ลำดับ", M + 14 / 2, y + 5.6, { align: "center" });
        doc.text("รายละเอียด", M + 14 + pad, y + 5.6);
        doc.text("หมายเหตุ", M + 14 + 108 + pad, y + 5.6);
        doc.setDrawColor.apply(doc, LINE);
        doc.line(M, y + 8, W - M, y + 8);
        y += 8;
      }
      drawHeader();

      (report.items || []).forEach((it, i) => {
        const dW = 108 - 2 * pad;
        const detailLines = doc.splitTextToSize(String(it.detail || ""), dW);
        const noteLines = it.note ? doc.splitTextToSize(String(it.note), CW - 14 - 108 - 2 * pad) : [];
        const rowH = Math.max(8, detailLines.length * lh + 3, noteLines.length * lh + 3);
        ensureY(rowH);
        doc.setFont("Anuphan", "normal");
        doc.setFontSize(10);
        doc.setTextColor.apply(doc, INK);
        doc.text(String(i + 1), M + 7, y + lh, { align: "center" });
        doc.text(detailLines, M + 14 + pad, y + lh);
        if (noteLines.length) doc.text(noteLines, M + 14 + 108 + pad, y + lh);
        doc.setDrawColor.apply(doc, LINE);
        doc.line(M, y + rowH, W - M, y + rowH);
        y += rowH;
      });

      /* section: images (2 ต่อแถว / 6 ต่อหน้า) */
      y += 6;
      ensureY(24);
      doc.setFont("Anuphan", "bold");
      doc.setFontSize(12);
      doc.setTextColor.apply(doc, INK);
      doc.text("ภาพประกอบ", M, y);
      y += 7;

      if (!images.length) {
        doc.setFont("Anuphan", "normal");
        doc.setFontSize(10);
        doc.setTextColor.apply(doc, GRAY);
        doc.text("ไม่มีภาพประกอบ", M, y);
      } else {
        const gap = 6, cw = (CW - gap) / 2, capPad = 2;
        for (let i = 0; i < images.length; i += 2) {
          const a = images[i], b = images[i + 1];
          const aH = Math.min(cw * (a.h / a.w), 70);
          const bH = b ? Math.min(cw * (b.h / b.w), 70) : 0;
          const capA = a.caption ? doc.splitTextToSize(a.caption, cw - 4) : [];
          const capB = b && b.caption ? doc.splitTextToSize(b.caption, cw - 4) : [];
          const capHA = capA.length ? capA.length * 3.6 + 2 : 0;
          const capHB = capB.length ? capB.length * 3.6 + 2 : 0;
          const rowH = Math.max(aH, bH) + Math.max(capHA, capHB);
          ensureY(rowH);
          try { doc.addImage(a.url, mimeOf(a.url), M, y, cw, aH); } catch (e) { /* skip bad image */ }
          if (b) { try { doc.addImage(b.url, mimeOf(b.url), M + cw + gap, y, cw, bH); } catch (e) {} }
          if (capA.length) {
            doc.setFont("Anuphan", "normal");
            doc.setFontSize(8);
            doc.setTextColor.apply(doc, GRAY);
            doc.text(capA, M + capPad, y + aH + 3.5);
          }
          if (b && capB.length) {
            doc.text(capB, M + cw + gap + capPad, y + bH + 3.5);
          }
          y += rowH;
        }
      }

      /* footer page numbers */
      const total = doc.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFont("Anuphan", "normal");
        doc.setFontSize(8);
        doc.setTextColor.apply(doc, GRAY);
        doc.text("DailyReport - " + report.date, M, H - 6);
        doc.text("หน้า " + p + "/" + total, W - M, H - 6, { align: "right" });
      }

      doc.save("DailyReport_" + report.date + ".pdf");
      DR.toast("ส่งออก PDF แล้ว", "success");
    } catch (e) {
      DR.toast("ส่งออก PDF ไม่สำเร็จ: " + e.message, "error");
    } finally {
      DR.setLoading(btn, false);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    DR.registerSW();
    init();
  });
})();
