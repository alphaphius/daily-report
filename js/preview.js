/* Preview + Export page logic */
(function () {
  const DR = window.DR;
  const $ = DR.$;

  let report = null;
  let images = []; // {url, mime, w, h, caption}
  let logoDataURL = "";
  let imagesReady = Promise.resolve();
  const PAGE_W = 794, PAGE_H = 1123, PAD = 32;

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

      renderDoc();
      $("#loading-box").classList.add("hidden");
      $("#doc-wrap").classList.remove("hidden");
      fitDoc();
      window.addEventListener("resize", fitDoc);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitDoc);

      $("#btn-image").addEventListener("click", exportImage);
      $("#btn-pdf").addEventListener("click", exportPDF);
      $("#btn-del-preview").addEventListener("click", deletePreviewReport);

      imagesReady = loadImages();
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

  /* Lazy-load the export libraries (only needed on export) */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("โหลดไลบรารีไม่สำเร็จ"));
      document.head.appendChild(s);
    });
  }

  /* ---------------- A4 document builders (inline styles only) ---------------- */

  function headerHTML() {
    const C = DR.CONFIG;
    const field = (l, v) =>
      '<span style="white-space:nowrap"><span style="color:#605850">' + DR.escapeHtml(l) + "&nbsp;:</span> " +
      '<span style="font-weight:700">' + DR.escapeHtml(String(v == null || v === "" ? "—" : v)) + "</span></span>";
    return '<div style="display:flex;align-items:center;gap:16px">' +
      '<img src="' + logoDataURL + '" style="width:64px;height:64px;border-radius:4px;object-fit:contain;flex-shrink:0" alt="logo" />' +
      '<h2 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#c2652a">' + DR.escapeHtml(C.REPORT_TITLE) + "</h2></div>" +
      '<div style="margin-top:16px;display:flex;flex-direction:column;gap:6px;font-size:12px">' +
      '<div style="display:flex;gap:40px;flex-wrap:wrap">' + field("วันที่", DR.fmtThai(report.date)) + field("ไซต์", report.site || "—") + "</div>" +
      '<div style="display:flex;gap:40px;flex-wrap:wrap">' + field("กลุ่มงาน", report.workGroup || "—") + field("เวลาเลิกงาน", report.endTime || "—") + "</div>" +
      "</div>" +
      '<div style="border-bottom:1px solid #d8d0c8;margin-top:20px"></div>';
  }

  function itemsTableHTML() {
    const rows = (report.items || []).map((it, i) =>
      "<tr" + (i % 2 ? ' style="background:#faf5ee"' : "") + ">" +
      '<td style="padding:12px;text-align:center">' + (i + 1) + "</td>" +
      '<td style="padding:12px">' + DR.escapeHtml(it.detail) + "</td>" +
      '<td style="padding:12px">' + (it.note ? DR.escapeHtml(it.note) : "—") + "</td></tr>").join("");
    return "<h3 style='margin:0 0 12px;font-size:18px;font-weight:700'>รายการปฏิบัติงาน</h3>" +
      '<div style="border:1px solid #d8d0c8;border-radius:8px;overflow:hidden;margin-bottom:24px">' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
      '<thead><tr style="background:#f6f0e8;color:#605850;border-bottom:1px solid #d8d0c8">' +
      '<th style="padding:12px;width:48px;text-align:center">ลำดับ</th>' +
      '<th style="padding:12px;text-align:left">รายละเอียด</th>' +
      '<th style="padding:12px;text-align:left">หมายเหตุ</th></tr></thead>' +
      "<tbody>" + rows + "</tbody></table></div>";
  }

  function imagesTitleHTML() {
    return "<h3 style='margin:0 0 12px;font-size:18px;font-weight:700'>ภาพประกอบ</h3>";
  }

  function imageBlockHTML(img, maxH) {
    return '<div style="width:100%;text-align:center;border:1px solid #d8d0c8;border-radius:8px;background:#f6f0e8;overflow:hidden;margin-bottom:12px">' +
      '<img src="' + img.url + '" style="max-width:100%;max-height:' + maxH + "px;height:auto;width:auto;object-fit:contain;display:inline-block\" />" +
      "</div>" +
      (img.caption ? '<div style="font-size:12px;margin:0 0 14px;color:#605850">' + DR.escapeHtml(img.caption) + "</div>" : "");
  }

  function bodyHTML() {
    return itemsTableHTML() +
      ((report.images || []).length ? imagesTitleHTML() + '<div id="doc-images"></div>' : "");
  }

  async function loadImages() {
    const holder = $("#doc-images");
    if (!holder) return;
    const imgList = (report.images || []).slice();
    if (!imgList.length) {
      holder.innerHTML = '<p style="margin:0;font-size:12px;color:#605850">ไม่มีภาพประกอบ</p>';
      return;
    }
    holder.innerHTML = '<p style="margin:0;font-size:12px;color:#605850">กำลังโหลดรูป ' + imgList.length + " รูป...</p>";
    await DR.mapLimit(imgList, 4, async (rec) => {
      const url = await DR.API.getImage(rec.fileId);
      const imgEl = await DR.loadImage(url);
      images.push({ url: url, mime: mimeOf(url), w: imgEl.naturalWidth || 800, h: imgEl.naturalHeight || 600, caption: rec.caption || "" });
      renderImagesSection();
      requestAnimationFrame(fitDoc);
    });
    if (!images.length) holder.innerHTML = '<p style="margin:0;font-size:12px;color:#605850">โหลดรูปไม่สำเร็จ</p>';
    else renderImagesSection();
  }

  function renderImagesSection() {
    const holder = $("#doc-images");
    if (!holder) return;
    holder.innerHTML = images.map((img) => imageBlockHTML(img, 900)).join("");
  }

  function renderDoc() {
    const doc = $("#report-doc");
    doc.innerHTML =
      '<div id="doc-header" style="padding:' + PAD + "px " + PAD + "px 0\">" + headerHTML() + "</div>" +
      '<div id="doc-body" style="padding:24px ' + PAD + "px " + PAD + "px\">" + bodyHTML() + "</div>";
  }

  /* Scale the A4 document (794px) to fit the screen width, keeping A4 proportions */
  function fitDoc() {
    const docEl = $("#report-doc");
    const box = $(".doc-scale-wrap");
    if (!docEl || !box) return;
    const avail = ($("#doc-wrap").clientWidth || box.clientWidth) - 0;
    const s = Math.min(1, avail / PAGE_W);
    docEl.style.transform = "scale(" + s + ")";
    docEl.style.transformOrigin = "top left";
    box.style.height = Math.round(docEl.offsetHeight * s) + "px";
  }

  /* ---------------- Export: PNG (บันทึกเป็นรูปภาพ) with A4 pagination ---------------- */
  function buildExportPages() {
    const labelH = 40;
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;left:-99999px;top:0;width:" + PAGE_W + "px;visibility:hidden;pointer-events:none;";
    document.body.appendChild(probe);
    const wrapHTML = (inner) => '<div style="padding:0 ' + PAD + "px\">" + inner + "</div>";
    const measure = (inner) => {
      probe.innerHTML = wrapHTML(inner);
      return probe.offsetHeight;
    };

    const headerH = (() => {
      probe.innerHTML = '<div style="padding:' + PAD + "px " + PAD + 'px 0">' + headerHTML() + "</div>";
      return probe.offsetHeight;
    })();

    let bodyH = PAGE_H - headerH - labelH;
    if (bodyH < 120) bodyH = 120;

    const blocks = [{ html: itemsTableHTML(), kind: "table" }];

    // paginate with cumulative measurement (margin-aware)
    const pages = [];
    let cur = "";
    for (let i = 0; i < blocks.length; i++) {
      const trial = cur + blocks[i].html;
      if (cur && measure(trial) > bodyH) {
        pages.push(cur);
        cur = blocks[i].html;
      } else {
        cur = trial;
      }
    }
    if (cur) pages.push(cur);
    if (!pages.length) pages.push("");

    document.body.removeChild(probe);
    return { headerHTML: headerHTML(), pages: pages };
  }

  async function exportImage() {
    const btn = $("#btn-image");
    DR.setLoading(btn, true, "กำลังสร้างรูป...");
    try {
      await imagesReady;
      await loadScript("./vendor/html2canvas.min.js");
      await document.fonts.ready;
      const data = buildExportPages();
      const total = data.pages.length;

      const wrapEl = document.createElement("div");
      wrapEl.style.cssText = "position:absolute;left:-99999px;top:0;width:" + PAGE_W + "px;";
      document.body.appendChild(wrapEl);

      const canvases = [];
      for (let i = 0; i < total; i++) {
        const pageEl = document.createElement("div");
        pageEl.style.cssText = "position:relative;width:" + PAGE_W + "px;height:" + PAGE_H + "px;background:#ffffff;overflow:hidden;";
        pageEl.innerHTML =
          '<div style="padding:' + PAD + "px " + PAD + 'px 0">' + data.headerHTML + "</div>" +
          '<div style="padding:0 ' + PAD + 'px">' + data.pages[i] + "</div>" +
          '<div style="position:absolute;left:' + PAD + "px;right:" + PAD + "px;bottom:14px;display:flex;justify-content:space-between;font-size:11px;color:#605850;font-family:'Anuphan','Hanken Grotesk',sans-serif;\">" +
          "<span>DailyReport - " + DR.escapeHtml(report.date) + "</span>" +
          "<span>หน้า " + (i + 1) + "/" + total + "</span></div>";
        wrapEl.appendChild(pageEl);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const c = await html2canvas(pageEl, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
        canvases.push(c);
      }

      const W = PAGE_W * 2, H = PAGE_H * 2;
      const out = document.createElement("canvas");
      out.width = W;
      out.height = H * total;
      const ctx = out.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
      canvases.forEach((c, i) => ctx.drawImage(c, 0, i * H));

      document.body.removeChild(wrapEl);
      const dataUrl = out.toDataURL("image/png");
      DR.download(dataUrl, "DailyReport_" + report.date + ".png");
      DR.toast("บันทึกรูปภาพแล้ว" + (total > 1 ? " (" + total + " หน้า)" : ""), "success");
    } catch (e) {
      DR.toast("ส่งออกรูปไม่สำเร็จ: " + e.message, "error");
    } finally {
      DR.setLoading(btn, false);
    }
  }

  function deletePreviewReport() {
    if (!confirm("ลบรายงานวันที่ " + DR.fmtThaiLong(report.date) + " ทั้งหมด?\nรูปถ่ายจะถูกลบด้วย และไม่สามารถย้อนกลับได้")) return;
    DR.API.deleteReport(report.date)
      .then(() => {
        DR.toast("ลบรายงานแล้ว", "success");
        setTimeout(() => { location.href = "index.html"; }, 900);
      })
      .catch((e) => DR.toast("ลบไม่สำเร็จ: " + e.message, "error"));
  }

  /* ================= Export: PDF (ส่งออกเป็น PDF) ================= */
  async function exportPDF() {
    const btn = $("#btn-pdf");
    DR.setLoading(btn, true, "กำลังสร้าง PDF...");
    try {
      await imagesReady;
      await Promise.all([
        loadScript("./vendor/jspdf.umd.min.js"),
        loadScript("./vendor/anuphan-fonts.js")
      ]);
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      Object.keys(window.ANUphan_FONTS || {}).forEach((name) => {
        doc.addFileToVFS(name, window.ANUphan_FONTS[name]);
      });
      doc.addFont("Anuphan-Regular.ttf", "Anuphan", "normal");
      doc.addFont("Anuphan-Bold.ttf", "Anuphan", "bold");

      const M = 12, W = 210, H = 297, CW = W - 2 * M;
      const PRIMARY = [194, 101, 42], GRAY = [96, 88, 80], INK = [58, 48, 42], LINE = [216, 208, 200];
      const pad = 3, lh = 5.2;
      let y = M;

      function ensureY(h) {
        if (y + h > H - M) newPage(false);
      }
      function drawMetaField(label, value, x, lineY) {
        const v = String(value || "—");
        doc.setFont("Anuphan", "normal");
        doc.setFontSize(10);
        doc.setTextColor.apply(doc, GRAY);
        doc.text(label, x, lineY);
        const lw = doc.getTextWidth(label);
        doc.setFont("Anuphan", "bold");
        doc.setTextColor.apply(doc, INK);
        doc.text(v, x + lw, lineY);
        return x + lw + doc.getTextWidth(v) + 14;
      }

      /* header (re-drawn on every page) */
      function drawDocHeader() {
        try {
          doc.addImage(logoDataURL, mimeOf(logoDataURL), M, y - 1, 14, 14);
        } catch (e) { /* logo optional */ }
        doc.setFont("Anuphan", "bold");
        doc.setFontSize(15);
        doc.setTextColor.apply(doc, PRIMARY);
        doc.text(DR.CONFIG.REPORT_TITLE, M + 18, y + 4);
        var mx1 = M + 18;
        mx1 = drawMetaField("วันที่:", DR.fmtThai(report.date), mx1, y + 14);
        drawMetaField("ไซต์:", report.site, mx1, y + 14);
        var mx2 = M + 18;
        mx2 = drawMetaField("กลุ่มงาน:", report.workGroup, mx2, y + 19.5);
        drawMetaField("เวลาเลิกงาน:", report.endTime, mx2, y + 19.5);
        y += 22;
        doc.setDrawColor.apply(doc, LINE);
        doc.setLineWidth(0.3);
        doc.line(M, y, W - M, y);
        y += 8;
      }
      function newPage(withTableHeader) {
        doc.addPage();
        y = M;
        doc.setFont("Anuphan", "normal");
        drawDocHeader();
        if (withTableHeader) drawTableHeader();
      }
      drawDocHeader();

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
        if (y + rowH > H - M) newPage(true);
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

      /* section: images */
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
        const capPad = 2;
        for (const img of images) {
          const cap = img.caption ? doc.splitTextToSize(img.caption, CW - 4) : [];
          const capH = cap.length ? cap.length * 3.6 + 2 : 0;
          const scale = Math.min(1, CW / img.w, (H - M - 2) / img.h);
          const iw = Math.max(10, img.w * scale), ih = Math.max(10, img.h * scale);
          ensureY(ih + capH);
          try { doc.addImage(img.url, mimeOf(img.url), M, y, iw, ih); } catch (e) { /* skip bad image */ }
          if (cap.length) {
            doc.setFont("Anuphan", "normal");
            doc.setFontSize(8);
            doc.setTextColor.apply(doc, GRAY);
            doc.text(cap, M + capPad, y + ih + 3.5);
          }
          y += ih + capH;
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
