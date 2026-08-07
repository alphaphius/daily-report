/*****************************************************************
 * DailyReport - Google Apps Script Backend (Web App)
 * ---------------------------------------------------------------
 * ใช้ Google Sheets เป็นฐานข้อมูล และ Google Drive เก็บรูปภาพ
 *
 * ขั้นตอนการติดตั้ง:
 *  1. เปิด https://script.google.com และเปิด Project ที่มีอยู่
 *     (Script ID: 1iMKuq-zR0do1R3sMMrCv9wUH50VKYCCi8IJOr7Mn-LDfytvpMJSrEIpL)
 *  2. นำโค้ดในไฟล์นี้ไปวางแทนที่ Code.gs เดิม
 *  3. เปิด Google Sheets ที่จะใช้เก็บข้อมูล แล้วคัดลอก Spreadsheet ID
 *     (อยู่ใน URL: https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit)
 *  4. เรียกฟังก์ชัน setupSpreadsheet("[SPREADSHEET_ID]") ในโปรเจกต์นี้ 1 ครั้ง
 *     (ถ้า Script ผูกกับ Spreadsheet อยู่แล้วก็ไม่ต้อง)
 *  5. Run ฟังก์ชัน setup() เพื่อสร้างชีต/โฟลเดอร์ (ต้อง Authorize ครั้งแรก)
 *  6. Deploy > New deployment > Web app
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  7. คัดลอก URL ที่ได้ (ลงท้าย /exec) ไปใส่ในไฟล์ config.js ที่
 *     คีย์ "API_URL" ของเว็บแอป แล้ว Deploy เว็บขึ้น GitHub Pages
 *****************************************************************/
const CONFIG_FOLDER_NAME = "DailyReport Images"; // ต้องตรงกับ config.js: DRIVE_FOLDER

const DEFAULTS = {
  workGroups: [
    { name: "งานโครงสร้าง", code: "WG-01" },
    { name: "งานสถาปัตยกรรม", code: "WG-02" },
    { name: "งานระบบ", code: "WG-03" }
  ],
  sites: [
    { name: "Site A - สุขุมวิท", address: "กรุงเทพมหานคร" },
    { name: "Site B - รัชดา", address: "กรุงเทพมหานคร" }
  ],
  endTimes: ["16:00", "16:30", "17:00", "17:30", "18:00"],
  defaultEndTime: "17:00"
};

/*****************************************************************
 * ENTRY POINTS
 *****************************************************************/
function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents || "{}"); } catch (err) { body = {}; }
  try {
    return respond(route(body));
  } catch (err) {
    return respond({ error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return respond({ ok: true, message: "DailyReport API ready" });
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function route(b) {
  switch (b.action) {
    case "getSettings":  return { settings: getSettings() };
    case "saveSettings": saveSettings(b.settings); return { ok: true };
    case "getCalendar":  return { dates: getCalendar(b.year, b.month) };
    case "getReport":    return { report: getReport(b.date) };
    case "searchReports":  return { reports: searchReports(b.query) };
    case "getReportsByRange": return { reports: getReportsByRange(b.start, b.end) };
    case "saveReport":   return saveReport(b.report);
    case "deleteReport": deleteReport(b.date); return { ok: true };
    case "getImage":     return getImage(b.id);
    default:             return { error: "Unknown action: " + b.action };
  }
}

/*****************************************************************
 * SETUP (เรียกครั้งแรก)
 *****************************************************************/
function setup() {
  var ss = getSpreadsheet();
  ensureSheets(ss);
  getImagesFolder();
  return "Setup complete. Spreadsheet: " + ss.getName();
}

function setupSpreadsheet(spreadsheetId) {
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", spreadsheetId);
  return setup();
}

function getSpreadsheet() {
  var prop = PropertiesService.getScriptProperties();
  var id = prop.getProperty("SPREADSHEET_ID");
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) {}
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    prop.setProperty("SPREADSHEET_ID", active.getId());
    return active;
  }
  // ยังไม่มีการตั้งค่า -> สร้าง Google Sheet ให้อัตโนมัติ
  var ss = SpreadsheetApp.create("DailyReport DB");
  prop.setProperty("SPREADSHEET_ID", ss.getId());
  return ss;
}

function ensureSheets(ss) {
  if (!ss.getSheetByName("Reports")) {
    var r = ss.insertSheet("Reports");
    r.appendRow(["date", "data", "updatedAt"]);
  }
  if (!ss.getSheetByName("Settings")) {
    var s = ss.insertSheet("Settings");
    s.appendRow(["key", "value"]);
  }
}

/*****************************************************************
 * SETTINGS
 *****************************************************************/
function getSettings() {
  var map = loadSettingsMap();
  var out = {};
  ["workGroups", "sites", "endTimes", "defaultEndTime"].forEach(function (k) {
    if (map[k] !== undefined && map[k] !== null && String(map[k]).length > 0) {
      try { out[k] = JSON.parse(map[k]); } catch (e) { out[k] = map[k]; }
    }
  });
  Object.keys(DEFAULTS).forEach(function (k) {
    if (out[k] === undefined) out[k] = DEFAULTS[k];
  });
  if (!Array.isArray(out.endTimes) || !out.endTimes.length) out.endTimes = DEFAULTS.endTimes;
  if (!out.defaultEndTime) out.defaultEndTime = DEFAULTS.defaultEndTime;
  return out;
}

function saveSettings(settings) {
  if (!settings) return;
  ["workGroups", "sites", "endTimes", "defaultEndTime"].forEach(function (k) {
    if (settings[k] !== undefined) setSetting(k, JSON.stringify(settings[k]));
  });
}

function loadSettingsMap() {
  var ss = getSpreadsheet();
  ensureSheets(ss);
  var sh = ss.getSheetByName("Settings");
  var vals = sh.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < vals.length; i++) {
    var k = String(vals[i][0]);
    if (k) map[k] = vals[i][1];
  }
  return map;
}

function setSetting(key, value) {
  var sh = getSpreadsheet().getSheetByName("Settings");
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) === key) {
      sh.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sh.appendRow([key, value]);
}

/*****************************************************************
 * CALENDAR
 *****************************************************************/
function getCalendar(year, month) {
  var sh = getSpreadsheet().getSheetByName("Reports");
  var vals = sh.getDataRange().getValues();
  var prefix = String(year) + "-" + pad2(month);
  var dates = [];
  for (var i = 1; i < vals.length; i++) {
    var d = normDate(vals[i][0]);
    if (d && d.indexOf(prefix) === 0) dates.push(d);
  }
  return dates;
}

/*****************************************************************
 * REPORT
 *****************************************************************/
function getReport(date) {
  var sh = getSpreadsheet().getSheetByName("Reports");
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (normDate(vals[i][0]) === String(date)) {
      try { return JSON.parse(vals[i][1]); } catch (e) { return null; }
    }
  }
  return null;
}

function findRow(sh, date) {
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (normDate(vals[i][0]) === String(date)) return i + 1;
  }
  return null;
}

/*****************************************************************
 * SEARCH + RANGE (อ่านทั้งหมดจากชีต Reports)
 *****************************************************************/
function readAllReports() {
  var sh = getSpreadsheet().getSheetByName("Reports");
  var vals = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    var date = normDate(vals[i][0]);
    var rep = null;
    try { rep = JSON.parse(vals[i][1]); } catch (e) {}
    if (!rep) continue;
    out.push({
      date: date,
      workGroup: rep.workGroup || "",
      site: rep.site || "",
      endTime: rep.endTime || "",
      items: rep.items || []
    });
  }
  out.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  return out;
}

function searchReports(query) {
  var q = String(query || "").toLowerCase().trim();
  if (!q) return [];
  var out = [];
  readAllReports().forEach(function (rep) {
    var hay = [rep.workGroup, rep.site, rep.endTime, rep.date];
    rep.items.forEach(function (it) {
      hay.push(it.detail || "");
      hay.push(it.note || "");
    });
    if (hay.join(" ").toLowerCase().indexOf(q) >= 0) {
      out.push(rep);
    }
  });
  return out.slice(0, 100);
}

function getReportsByRange(start, end) {
  var s = String(start || ""), e = String(end || "");
  var out = readAllReports().filter(function (rep) {
    if (!rep.date) return false;
    if (s && rep.date < s) return false;
    if (e && rep.date > e) return false;
    return true;
  });
  return out;
}

function saveReport(report) {
  if (!report || !report.date) throw new Error("ข้อมูลรายงานไม่ถูกต้อง");
  var ss = getSpreadsheet();
  ensureSheets(ss);
  var sh = ss.getSheetByName("Reports");
  var date = String(report.date);

  var imgOut = [];
  (report.images || []).forEach(function (img) {
    if (img.fileId) {
      imgOut.push({ fileId: img.fileId, caption: img.caption || "" });
    } else if (img.dataUrl && String(img.dataUrl).indexOf("data:") === 0) {
      var fid = uploadImage(img.dataUrl, date);
      imgOut.push({ fileId: fid, caption: img.caption || "" });
    }
  });

  // ลบรูปที่ถูกนำออกจากรายงาน
  var old = getReport(date);
  if (old && old.images) {
    var keep = {};
    imgOut.forEach(function (x) { keep[x.fileId] = true; });
    old.images.forEach(function (x) {
      if (x.fileId && !keep[x.fileId]) {
        try { DriveApp.getFileById(x.fileId).setTrashed(true); } catch (e) {}
      }
    });
  }

  var clean = {
    date: date,
    workGroup: report.workGroup || "",
    site: report.site || "",
    endTime: report.endTime || "",
    items: report.items || [],
    images: imgOut,
    updatedAt: new Date().toISOString()
  };
  var json = JSON.stringify(clean);
  var row = findRow(sh, date);
  if (row) {
    sh.getRange(row, 2).setValue(json);
    sh.getRange(row, 3).setValue(clean.updatedAt);
  } else {
    sh.appendRow([date, json, clean.updatedAt]);
  }
  return { ok: true, report: clean };
}

function deleteReport(date) {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName("Reports");
  var rep = getReport(date);
  if (rep && rep.images) {
    rep.images.forEach(function (x) {
      if (x.fileId) { try { DriveApp.getFileById(x.fileId).setTrashed(true); } catch (e) {} }
    });
  }
  var row = findRow(sh, date);
  if (row) sh.deleteRow(row);
}

/*****************************************************************
 * IMAGES (Google Drive)
 *****************************************************************/
function getImagesFolder() {
  var prop = PropertiesService.getScriptProperties();
  var id = prop.getProperty("DRIVE_FOLDER_ID");
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) {}
  }
  var it = DriveApp.getFoldersByName(CONFIG_FOLDER_NAME);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG_FOLDER_NAME);
  try {
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}
  prop.setProperty("DRIVE_FOLDER_ID", folder.getId());
  return folder;
}

function uploadImage(dataUrl, date) {
  var folder = getImagesFolder();
  var m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!m) throw new Error("ข้อมูลรูปภาพไม่ถูกต้อง");
  var contentType = m[1];
  var bytes = Utilities.base64Decode(m[2]);
  var ext = contentType.indexOf("png") >= 0 ? "png" : "jpg";
  var name = "report_" + date + "_" + new Date().getTime() + "." + ext;
  var blob = Utilities.newBlob(bytes, contentType, name);
  return folder.createFile(blob).getId();
}

function getImage(id) {
  var file = DriveApp.getFileById(id);
  var blob = file.getBlob();
  return {
    mime: blob.getContentType(),
    b64: Utilities.base64Encode(blob.getBytes())
  };
}

/*****************************************************************
 * HELPERS
 *****************************************************************/
function pad2(n) {
  n = Number(n);
  return n < 10 ? "0" + n : String(n);
}

function normDate(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(v);
}
