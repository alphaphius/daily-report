/* Settings page logic */
(function () {
  const DR = window.DR;
  const $ = DR.$, $$ = DR.$$;

  const state = {
    workGroups: [],
    sites: [],
    endTimes: ["17:00"],
    defaultEndTime: "17:00"
  };

  const modal = {
    mode: "group",       // 'group' | 'site'
    editId: null,
    lastFocus: null,
    root: $("#modal"),
    title: $("#modal-title"),
    label1: $("#modal-label-1"),
    field1: $("#modal-field-1"),
    label2: $("#modal-label-2"),
    field2: $("#modal-field-2"),
    ok: $("#modal-ok"),
    cancel: $("#modal-cancel")
  };

  async function init() {
    try {
      const r = await DR.API.getSettings();
      Object.assign(state, {
        workGroups: r.settings.workGroups || [],
        sites: r.settings.sites || [],
        endTimes: (r.settings.endTimes && r.settings.endTimes.length) ? r.settings.endTimes : ["17:00"],
        defaultEndTime: r.settings.defaultEndTime || "17:00"
      });
    } catch (e) {
      DR.toast("ไม่สามารถโหลดข้อมูลตั้งค่าได้: " + e.message, "error");
    }
    render();
    bindEvents();
  }

  function render() {
    renderGroups();
    renderSites();
    renderTimes();
  }

  /* ---------- renderers ---------- */
  function renderGroups() {
    const list = $("#groups-list");
    if (!state.workGroups.length) {
      list.innerHTML = '<li class="p-6 text-center text-on-surface-variant">ยังไม่มีกลุ่มงาน</li>';
      return;
    }
    list.innerHTML = state.workGroups.map((g, i) =>
      '<li class="p-4 flex justify-between items-center hover:bg-surface-container-low transition-colors group">' +
      "<div><p class='text-body-md font-body-md font-medium text-on-surface'>" + DR.escapeHtml(g.name) + "</p>" +
      "<p class='text-label-md font-label-md text-on-surface-variant'>" + (g.code ? "รหัส: " + DR.escapeHtml(g.code) : "&nbsp;") + "</p></div>" +
      '<div class="flex gap-1">' +
      '<button type="button" data-g-act="edit" data-i="' + i + '" aria-label="แก้ไขกลุ่มงาน ' + DR.escapeHtml(g.name) + '" class="w-11 h-11 inline-flex items-center justify-center text-surface-tint hover:bg-primary-fixed rounded-full transition-colors" title="แก้ไข"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>' +
      '<button type="button" data-g-act="del" data-i="' + i + '" aria-label="ลบกลุ่มงาน ' + DR.escapeHtml(g.name) + '" class="w-11 h-11 inline-flex items-center justify-center text-error hover:bg-error-container rounded-full transition-colors" title="ลบ"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button>' +
      "</div></li>").join("");
  }

  function renderSites() {
    const list = $("#sites-list");
    if (!state.sites.length) {
      list.innerHTML = '<li class="p-6 text-center text-on-surface-variant">ยังไม่มีสถานที่/ไซต์งาน</li>';
      return;
    }
    list.innerHTML = state.sites.map((s, i) =>
      '<li class="p-4 flex justify-between items-center hover:bg-surface-container-low transition-colors group">' +
      "<div><p class='text-body-md font-body-md font-medium text-on-surface'>" + DR.escapeHtml(s.name) + "</p>" +
      "<p class='text-label-md font-label-md text-on-surface-variant'>" + (s.address ? DR.escapeHtml(s.address) : "&nbsp;") + "</p></div>" +
      '<div class="flex gap-1">' +
      '<button type="button" data-s-act="edit" data-i="' + i + '" aria-label="แก้ไขสถานที่ ' + DR.escapeHtml(s.name) + '" class="w-11 h-11 inline-flex items-center justify-center text-surface-tint hover:bg-primary-fixed rounded-full transition-colors" title="แก้ไข"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>' +
      '<button type="button" data-s-act="del" data-i="' + i + '" aria-label="ลบสถานที่ ' + DR.escapeHtml(s.name) + '" class="w-11 h-11 inline-flex items-center justify-center text-error hover:bg-error-container rounded-full transition-colors" title="ลบ"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button>' +
      "</div></li>").join("");
  }

  function renderTimes() {
    const chips = $("#times-chips");
    if (!state.endTimes.length) {
      chips.innerHTML = '<span class="text-label-md text-on-surface-variant">ยังไม่มีเวลา ตัวอย่าง: 17:00</span>';
    } else {
      chips.innerHTML = state.endTimes.map((t, i) =>
        '<span class="inline-flex items-center gap-2 bg-surface-container rounded-full pl-4 pr-1 py-1 border border-outline-variant text-sm">' +
        DR.escapeHtml(t) +
        '<button type="button" data-t-del="' + i + '" aria-label="ลบเวลา ' + DR.escapeHtml(t) + '" class="text-error hover:bg-error-container rounded-full w-9 h-9 inline-flex items-center justify-center"><span class="material-symbols-outlined text-lg" aria-hidden="true">close</span></button></span>').join("");
    }
    const sel = $("#default-time");
    sel.innerHTML = state.endTimes.map((t) => '<option value="' + DR.escapeHtml(t) + '"' + (t === state.defaultEndTime ? " selected" : "") + ">" + DR.escapeHtml(t) + "</option>").join("");
  }

  /* ---------- events ---------- */
  function bindEvents() {
    $("#btn-add-group").addEventListener("click", () => openModal("group", null));
    $("#btn-add-site").addEventListener("click", () => openModal("site", null));

    $("#groups-list").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-g-act]");
      if (!btn) return;
      const i = Number(btn.dataset.i);
      if (btn.dataset.gAct === "edit") openModal("group", state.workGroups[i], i);
      else {
        if (confirm("ลบกลุ่มงานนี้?")) {
          state.workGroups.splice(i, 1);
          renderGroups();
          saveSettings();
        }
      }
    });

    $("#sites-list").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-s-act]");
      if (!btn) return;
      const i = Number(btn.dataset.i);
      if (btn.dataset.sAct === "edit") openModal("site", state.sites[i], i);
      else {
        if (confirm("ลบสถานที่นี้?")) {
          state.sites.splice(i, 1);
          renderSites();
          saveSettings();
        }
      }
    });

    $("#btn-add-time").addEventListener("click", addTime);
    $("#time-input").addEventListener("keydown", (e) => { if (e.key === "Enter") addTime(); });
    $("#times-chips").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-t-del]");
      if (!btn) return;
      const i = Number(btn.dataset.tDel);
      state.endTimes.splice(i, 1);
      if (!state.endTimes.includes(state.defaultEndTime)) state.defaultEndTime = state.endTimes[0] || "";
      renderTimes();
    });
    $("#default-time").addEventListener("change", (e) => { state.defaultEndTime = e.target.value; });
    $("#btn-save-time").addEventListener("click", async () => {
      if (!state.endTimes.length) { DR.toast("กรุณาเพิ่มเวลาอย่างน้อย 1 รายการ", "error"); return; }
      if (!state.endTimes.includes(state.defaultEndTime)) state.defaultEndTime = state.endTimes[0];
      await saveSettings("บันทึกการตั้งค่าเวลาแล้ว");
    });

    modal.cancel.addEventListener("click", closeModal);
    modal.root.addEventListener("click", (e) => { if (e.target === modal.root) closeModal(); });
    modal.ok.addEventListener("click", submitModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.root.classList.contains("hidden")) closeModal();
    });
  }

  function addTime() {
    const v = $("#time-input").value;
    if (!v) { DR.toast("กรุณาเลือกเวลา", "error"); return; }
    if (state.endTimes.includes(v)) { DR.toast("เวลานี้มีอยู่แล้ว", "error"); return; }
    state.endTimes.push(v);
    state.endTimes.sort();
    if (!state.defaultEndTime) state.defaultEndTime = v;
    renderTimes();
    $("#time-input").value = "";
  }

  /* ---------- modal ---------- */
  function openModal(mode, item, index) {
    modal.mode = mode;
    modal.editId = index !== undefined && index !== null ? index : null;
    if (mode === "group") {
      modal.title.textContent = modal.editId !== null ? "แก้ไขกลุ่มงาน" : "เพิ่มกลุ่มงาน";
      modal.label1.textContent = "ชื่อกลุ่มงาน";
      modal.label2.textContent = "รหัส (ถ้ามี)";
      modal.field1.value = item ? item.name : "";
      modal.field2.value = item ? item.code : "";
    } else {
      modal.title.textContent = modal.editId !== null ? "แก้ไขสถานที่" : "เพิ่มสถานที่";
      modal.label1.textContent = "ชื่อสถานที่/ไซต์งาน";
      modal.label2.textContent = "ที่อยู่/รายละเอียด (ถ้ามี)";
      modal.field1.value = item ? item.name : "";
      modal.field2.value = item ? item.address : "";
    }
    modal.root.classList.remove("hidden");
    modal.lastFocus = document.activeElement;
    setTimeout(() => modal.field1.focus(), 50);
  }

  function closeModal() {
    modal.root.classList.add("hidden");
    modal.field1.value = "";
    modal.field2.value = "";
    if (modal.lastFocus && modal.lastFocus.focus) modal.lastFocus.focus();
  }

  function submitModal() {
    const name = modal.field1.value.trim();
    const extra = modal.field2.value.trim();
    if (!name) { DR.toast("กรุณากรอกชื่อ", "error"); return; }
    if (modal.mode === "group") {
      if (modal.editId !== null) {
        state.workGroups[modal.editId] = { name: name, code: extra };
        DR.toast("แก้ไขกลุ่มงานแล้ว", "success");
      } else {
        state.workGroups.push({ name: name, code: extra });
        DR.toast("เพิ่มกลุ่มงานแล้ว", "success");
      }
      renderGroups();
    } else {
      if (modal.editId !== null) {
        state.sites[modal.editId] = { name: name, address: extra };
        DR.toast("แก้ไขสถานที่แล้ว", "success");
      } else {
        state.sites.push({ name: name, address: extra });
        DR.toast("เพิ่มสถานที่แล้ว", "success");
      }
      renderSites();
    }
    closeModal();
    saveSettings();
  }

  async function saveSettings(successMsg) {
    try {
      await DR.API.saveSettings({
        workGroups: state.workGroups,
        sites: state.sites,
        endTimes: state.endTimes,
        defaultEndTime: state.defaultEndTime
      });
      if (successMsg) DR.toast(successMsg, "success");
    } catch (e) {
      DR.toast("บันทึกการตั้งค่าไม่สำเร็จ: " + e.message, "error");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    DR.registerSW();
    init();
  });
})();
