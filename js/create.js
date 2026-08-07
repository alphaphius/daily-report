/* Create report page logic */
(function () {
  const DR = window.DR;
  const $ = DR.$, $$ = DR.$$;

  const state = {
    reportDate: DR.todayStr(),
    settings: { workGroups: [], sites: [], endTimes: [], defaultEndTime: "17:00" },
    items: [],
    images: [], // {dataUrl, caption, fileId}
    editIndex: null
  };

  const refs = {
    group: $("#f-group"),
    site: $("#f-site"),
    endTime: $("#f-endtime"),
    detail: $("#i-detail"),
    note: $("#i-note"),
    addItem: $("#btn-add-item"),
    itemsBody: $("#items-body"),
    itemsCount: $("#items-count"),
    dropzone: $("#dropzone"),
    fileInput: $("#file-input"),
    imgGrid: $("#img-grid"),
    saveBtn: $("#btn-save")
  };

  async function init() {
    const qs = new URLSearchParams(location.search);
    state.reportDate = qs.get("date") || DR.todayStr();
    $("#date-pill-text").textContent = DR.fmtThaiLong(state.reportDate);
    document.title = "สร้างรายงาน " + DR.fmtThai(state.reportDate) + " - DailyReport";

    try {
      const s = await DR.API.getSettings();
      state.settings = Object.assign(state.settings, s.settings || {});
      populateSelects();
      renderItems();
      renderImages();
    } catch (e) {
      DR.toast("ไม่สามารถโหลดข้อมูลตั้งค่าได้: " + e.message, "error");
      populateSelects();
      renderItems();
      renderImages();
    }

    loadExisting();

    refs.addItem.addEventListener("click", addItem);
    refs.detail.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } });
    refs.dropzone.addEventListener("click", () => refs.fileInput.click());
    refs.fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
    ["dragover", "drop"].forEach((evt) => {
      refs.dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        if (evt === "drop" && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
      });
    });
    refs.saveBtn.addEventListener("click", save);
  }

  function populateSelects() {
    const s = state.settings;
    refs.group.innerHTML = '<option value="">เลือกกลุ่มงาน</option>' +
      (s.workGroups || []).map((g) => '<option value="' + DR.escapeHtml(g.name || g) + '">' + DR.escapeHtml(g.name || g) + "</option>").join("");
    refs.site.innerHTML = '<option value="">เลือกไซต์งาน</option>' +
      (s.sites || []).map((x) => '<option value="' + DR.escapeHtml(x.name || x) + '">' + DR.escapeHtml(x.name || x) + "</option>").join("");
    const times = (s.endTimes && s.endTimes.length) ? s.endTimes : [s.defaultEndTime || "17:00"];
    refs.endTime.innerHTML = '<option value="">เลือกเวลาเลิกงาน</option>' +
      times.map((t) => '<option value="' + DR.escapeHtml(t) + '">' + DR.escapeHtml(t) + "</option>").join("");
  }

  async function loadExisting() {
    try {
      const r = await DR.API.getReport(state.reportDate);
      const rep = r.report;
      if (!rep || !Array.isArray(rep.items)) return;
      refs.group.value = rep.workGroup || "";
      refs.site.value = rep.site || "";
      refs.endTime.value = rep.endTime || "";
      state.items = rep.items.map((it) => ({ detail: it.detail || "", note: it.note || "" }));
      renderItems();
      const imgs = rep.images || [];
      for (let i = 0; i < imgs.length; i++) {
        state.images.push({ fileId: imgs[i].fileId, caption: imgs[i].caption || "", dataUrl: null });
      }
      renderImages();
      loadImageDataURLs();
    } catch (e) {
      DR.toast("ไม่สามารถโหลดรายงานเดิมได้: " + e.message, "error");
    }
  }

  async function loadImageDataURLs() {
    for (let i = 0; i < state.images.length; i++) {
      const img = state.images[i];
      if (img.dataUrl) continue;
      try {
        img.dataUrl = await DR.API.getImage(img.fileId);
        updateImgCard(i);
      } catch (e) {
        DR.toast("ไม่สามารถโหลดรูป " + (i + 1) + " ได้", "error");
      }
    }
  }

  /* ---------- items ---------- */
  function addItem() {
    const detail = refs.detail.value.trim();
    const note = refs.note.value.trim();
    if (!detail) { DR.toast("กรุณากรอกรายละเอียดงาน", "error"); return; }
    if (state.editIndex !== null) {
      state.items[state.editIndex] = { detail: detail, note: note };
      state.editIndex = null;
      resetItemForm();
      DR.toast("แก้ไขรายการแล้ว", "success");
    } else {
      state.items.push({ detail: detail, note: note });
      DR.toast("เพิ่มรายการแล้ว", "success");
    }
    refs.detail.value = "";
    refs.note.value = "";
    renderItems();
  }

  function resetItemForm() {
    refs.detail.value = "";
    refs.note.value = "";
    refs.addItem.innerHTML = '<span class="material-symbols-outlined">add</span> เพิ่มรายการ';
    state.editIndex = null;
  }

  function editItem(idx) {
    state.editIndex = idx;
    refs.detail.value = state.items[idx].detail;
    refs.note.value = state.items[idx].note;
    refs.detail.focus();
    refs.addItem.innerHTML = '<span class="material-symbols-outlined">check</span> แก้ไขรายการแล้ว';
  }

  function deleteItem(idx) {
    if (!confirm("ลบรายการนี้?")) return;
    state.items.splice(idx, 1);
    if (state.editIndex === idx) resetItemForm();
    renderItems();
  }

  function renderItems() {
    const tbody = refs.itemsBody;
    if (!state.items.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center text-on-surface-variant">ยังไม่มีรายการงาน</td></tr>';
    } else {
      tbody.innerHTML = state.items.map((it, i) =>
        '<tr class="hover:bg-surface-container-lowest transition-colors group">' +
        '<td class="p-4 text-on-surface">' + DR.escapeHtml(it.detail) + "</td>" +
        '<td class="p-4 text-on-surface-variant">' + (it.note ? DR.escapeHtml(it.note) : "—") + "</td>" +
        '<td class="p-4 text-center whitespace-nowrap">' +
        '<button data-act="edit" data-i="' + i + '" class="p-2 text-outline hover:text-primary transition-colors" title="แก้ไข"><span class="material-symbols-outlined text-sm">edit</span></button>' +
        '<button data-act="del" data-i="' + i + '" class="p-2 text-outline hover:text-error transition-colors" title="ลบ"><span class="material-symbols-outlined text-sm">delete</span></button>' +
        "</td></tr>").join("");
      $$("[data-act]", tbody).forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = Number(btn.dataset.i);
          btn.dataset.act === "edit" ? editItem(i) : deleteItem(i);
        });
      });
    }
    refs.itemsCount.textContent = "รวม " + state.items.length + " รายการ";
  }

  /* ---------- images ---------- */
  async function handleFiles(fileList) {
    const files = Array.from(fileList);
    for (const f of files) {
      if (!/^image\//.test(f.type)) { DR.toast("รองรับเฉพาะไฟล์รูปภาพ", "error"); continue; }
      try {
        const dataUrl = await DR.compressImage(f);
        state.images.push({ dataUrl: dataUrl, caption: "", fileId: null });
        renderImages();
      } catch (e) {
        DR.toast("อัปโหลดรูป " + f.name + " ไม่สำเร็จ", "error");
      }
    }
    refs.fileInput.value = "";
  }

  function removeImage(i) {
    if (!confirm("ลบรูปนี้?")) return;
    state.images.splice(i, 1);
    renderImages();
  }

  function updateImgCard(i) {
    const card = $("#img-card-" + i);
    if (!card) return;
    const img = state.images[i];
    if (img.dataUrl) {
      const thumb = card.querySelector(".img-thumb");
      thumb.style.backgroundImage = "url(" + img.dataUrl + ")";
      thumb.classList.remove("bg-surface-container");
      thumb.classList.add("bg-cover", "bg-center");
    }
  }

  function renderImages() {
    const grid = refs.imgGrid;
    if (!state.images.length) {
      grid.innerHTML = "";
      return;
    }
    grid.innerHTML = state.images.map((img, i) =>
      '<div id="img-card-' + i + '" class="bg-surface-container rounded-lg border border-outline-variant overflow-hidden">' +
      '<div class="img-thumb aspect-square bg-surface-container w-full relative group">' +
      (img.dataUrl ? '<div class="bg-cover bg-center w-full h-full" style="background-image:url(' + img.dataUrl + ')"></div>' : '<div class="spinner absolute inset-0 m-auto"></div>') +
      '<button data-img-remove="' + i + '" class="absolute top-2 right-2 p-1 bg-white/90 rounded-full shadow-sm text-error"><span class="material-symbols-outlined text-sm">close</span></button>' +
      "</div>" +
      '<input data-img-caption="' + i + '" type="text" value="' + DR.escapeHtml(img.caption || "") + '" placeholder="คำอธิบายรูป (ถ้ามี)" class="w-full px-3 py-2 text-sm bg-surface-container-lowest border-0 border-t border-outline-variant focus:outline-none focus:ring-0" />' +
      "</div>").join("");

    $$("[data-img-remove]", grid).forEach((btn) => {
      btn.addEventListener("click", () => removeImage(Number(btn.dataset.imgRemove)));
    });
    $$("[data-img-caption]", grid).forEach((inp) => {
      inp.addEventListener("input", () => {
        state.images[Number(inp.dataset.imgCaption)].caption = inp.value.trim();
      });
    });
  }

  /* ---------- save ---------- */
  async function save() {
    const workGroup = refs.group.value;
    const site = refs.site.value;
    const endTime = refs.endTime.value;
    if (!workGroup) { DR.toast("กรุณาเลือกกลุ่มงาน", "error"); return; }
    if (!site) { DR.toast("กรุณาเลือกไซต์งาน", "error"); return; }
    if (!endTime) { DR.toast("กรุณาเลือกเวลาเลิกงาน", "error"); return; }
    if (!state.items.length) { DR.toast("กรุณาเพิ่มรายการงานอย่างน้อย 1 รายการ", "error"); return; }

    const report = {
      date: state.reportDate,
      workGroup: workGroup,
      site: site,
      endTime: endTime,
      items: state.items,
      images: state.images.map((img) => ({
        fileId: img.fileId || null,
        caption: img.caption || "",
        dataUrl: img.dataUrl || null
      }))
    };

    DR.setLoading(refs.saveBtn, true, "กำลังบันทึก...");
    try {
      const r = await DR.API.saveReport(report);
      DR.toast("บันทึกรายงานแล้ว", "success");
      setTimeout(() => { location.href = "preview.html?date=" + state.reportDate + "&saved=1"; }, 600);
    } catch (e) {
      DR.setLoading(refs.saveBtn, false);
      DR.toast("บันทึกไม่สำเร็จ: " + e.message, "error");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    DR.registerSW();
    DR.loadLogo().then((src) => { const el = $("#app-logo"); if (el) el.src = src; });
    init();
  });
})();
