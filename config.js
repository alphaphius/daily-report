// ============================================================
// DailyReport - ค่ากำหนดแอปพลิเคชัน
// ============================================================
// API_URL: URL ของ Google Apps Script Web App (หลัง Deploy เป็น Web App)
// รูปแบบ: https://script.google.com/macros/s/XXXXXXXXXXXXXX/exec
//
// หากยังไม่ได้ Deploy ให้เปิด project Apps Script ที่ https://script.google.com
// แล้วนำ Code.gs ที่ให้ไว้ไปวาง แล้วทำการ Deploy > New deployment > Web app
// (Execute as: Me / Who has access: Anyone)
// จากนั้นคัดลอก URL ไปวางที่ API_URL ด้านล่าง
// ============================================================
window.CONFIG = {
  API_URL: "https://script.google.com/macros/s/1iMKuq-zR0do1R3sMMrCv9wUH50VKYCCi8IJOr7Mn-LDfytvpMJSrEIpL/exec",

  // ที่อยู่ logo (ถ้าต้องการเปลี่ยนก็แก้ตรงนี้)
  LOGO_URL: "https://cdn-icons-png.flaticon.com/128/9824/9824404.png",

  // ชื่อแอปและหัวรายงาน
  APP_NAME: "DailyReport",
  REPORT_TITLE: "รายงานการปฏิบัติงานประจำวัน",

  // ชื่อโฟลเดอร์ใน Google Drive เก็บรูปภาพ
  DRIVE_FOLDER: "DailyReport Images",

  // จำกัดขนาดรูปที่อัปโหลด (px) และคุณภาพ
  IMAGE_MAX_DIM: 1600,
  IMAGE_QUALITY: 0.82
};
