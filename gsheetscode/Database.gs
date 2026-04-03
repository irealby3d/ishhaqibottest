// ============================================================
// DATABASE.GS
// ============================================================
// "Hodimlar" sheet ustunlari (0-based):
//  0:TelegramId | 1:Username | 2:CanAdd
//  3:SuperAdmin | 4:Direktor | 5:Admin
//  6:canViewAll | 7:canEdit  | 8:canDelete
//  9:canExport  | 10:canViewDash
// ============================================================

var COL = {
  TG_ID:        0,
  USERNAME:     1,
  CAN_ADD:      2,
  SUPER_ADMIN:  3,
  DIREKTOR:     4,
  ADMIN:        5,
  VIEW_ALL:     6,
  EDIT:         7,
  DELETE:       8,
  EXPORT:       9,
  VIEW_DASH:    10
};

function getSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Data sheet — birinchi varaq
  var dataSheet = ss.getSheets()[0];

  // Hodimlar sheet — yo'q bo'lsa yaratadi
  var empSheet = ss.getSheetByName("Hodimlar");
  if (!empSheet) {
    empSheet = ss.insertSheet("Hodimlar");
    empSheet.appendRow([
      "TelegramId","Username","CanAdd",
      "SuperAdmin","Direktor","Admin",
      "canViewAll","canEdit","canDelete","canExport","canViewDash"
    ]);
    empSheet.getRange(1,1,1,11)
      .setFontWeight("bold")
      .setBackground("#1e3c72")
      .setFontColor("#ffffff");

    // SuperAdmin ni avtomatik qo'shish (Config.gs dan)
    if (CONFIG.SUPER_ADMIN_ID && CONFIG.SUPER_ADMIN_NAME) {
      empSheet.appendRow([
        CONFIG.SUPER_ADMIN_ID, CONFIG.SUPER_ADMIN_NAME,
        1, 1, 0, 0, 1, 1, 1, 1, 1
      ]);
    }
  }
  return { dataSheet: dataSheet, empSheet: empSheet };
}

// ---- Hodim ma'lumotlarini olish ----
function getEmployee(tgId) {
  var empSheet = getSheets().empSheet;
  var rows = empSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][COL.TG_ID]) === String(tgId)) {
      return {
        sheetRow:    i + 1,
        tgId:        String(rows[i][COL.TG_ID]),
        username:    String(rows[i][COL.USERNAME] || ''),
        canAdd:      Number(rows[i][COL.CAN_ADD])      === 1,
        isSuperAdmin:Number(rows[i][COL.SUPER_ADMIN])  === 1,
        isDirektor:  Number(rows[i][COL.DIREKTOR])     === 1,
        isAdmin:     Number(rows[i][COL.ADMIN])        === 1,
        permissions: {
          canViewAll:  Number(rows[i][COL.VIEW_ALL])  === 1,
          canEdit:     Number(rows[i][COL.EDIT])      === 1,
          canDelete:   Number(rows[i][COL.DELETE])    === 1,
          canExport:   Number(rows[i][COL.EXPORT])    === 1,
          canViewDash: Number(rows[i][COL.VIEW_DASH]) === 1
        }
      };
    }
  }
  return null; // Ro'yxatda yo'q
}

// ---- Rollarni aniqlash ----
function checkUserRoles(tgId) {
  var emp = getEmployee(tgId);

  var auth = {
    role: "User", username: "",
    isAdmin: false, isBoss: false,
    isDirector: false, isSuperAdmin: false,
    canAdd: true, // + tugmasi hammaga ko'rinadi
    permissions: {
      canViewAll:false, canEdit:false,
      canDelete:false, canExport:false, canViewDash:false
    }
  };

  if (!emp) {
    // Ro'yxatda yo'q — oddiy foydalanuvchi, amal qo'sha olmaydi
    auth.canAdd = false;
    return auth;
  }

  auth.username   = emp.username;
  auth.canAdd     = emp.canAdd;

  if (emp.isSuperAdmin) {
    auth.role = "SuperAdmin";
    auth.isAdmin = true; auth.isBoss = true; auth.isSuperAdmin = true;
    auth.permissions = {
      canViewAll:true, canEdit:true,
      canDelete:true, canExport:true, canViewDash:true
    };
  } else if (emp.isDirektor) {
    auth.role = "Direktor";
    auth.isDirector = true;
    auth.permissions = {
      canViewAll:true, canEdit:false,
      canDelete:false, canExport:true, canViewDash:true
    };
  } else if (emp.isAdmin) {
    auth.role = "Admin";
    auth.isAdmin = true;
    auth.permissions = emp.permissions;
  }

  return auth;
}

// ============================================================
// DATA SHEET FUNKSIYALARI
// ============================================================

function formatDateCell(val) {
  if (!val || val === '') return '';
  var parsed = parseDateInput_(val, null);
  if (parsed) return parsed.display;
  return String(val);
}

function parseDateInput_(dateValue, dateISOValue) {
  // Prefer explicit ISO from frontend when available.
  var parsed = parseDateRaw_(dateISOValue);
  if (!parsed) parsed = parseDateRaw_(dateValue);
  return parsed;
}

function parseDateRaw_(raw) {
  if (raw === null || raw === undefined || raw === '') return null;

  if (Object.prototype.toString.call(raw) === '[object Date]') {
    if (isNaN(raw.getTime())) return null;
    return buildDateMeta_(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
  }

  if (typeof raw === 'number' && isFinite(raw)) {
    // Excel serial date fallback.
    var serial = Math.floor(raw);
    var utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return buildDateMeta_(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
  }

  var str = String(raw).trim();
  if (!str || str === 'undefined' || str === 'null') return null;

  var m;

  // ISO: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
  m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (m) return buildDateMeta_(Number(m[1]), Number(m[2]), Number(m[3]));

  // DD/MM/YYYY (also supports DD.MM.YYYY, DD-MM-YYYY)
  m = str.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) return buildDateMeta_(Number(m[3]), Number(m[2]), Number(m[1]));

  return null;
}

function buildDateMeta_(y, m, d) {
  if (!isValidYmd_(y, m, d)) return null;
  var dd = ('0' + d).slice(-2);
  var mm = ('0' + m).slice(-2);
  var yy = String(y);
  return {
    year: yy,
    month: mm,
    day: dd,
    iso: yy + '-' + mm + '-' + dd,
    display: dd + '/' + mm + '/' + yy,
    dateObj: new Date(y, m - 1, d)
  };
}

function isValidYmd_(y, m, d) {
  if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return false;
  if (y < 1900 || y > 2200) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  var dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && (dt.getMonth() + 1) === m && dt.getDate() === d;
}

function initUser(tgId, auth) {
  var dataSheet   = getSheets().dataSheet;
  var values      = dataSheet.getDataRange().getValues();
  var usernameMap = buildUsernameMap();   // Hodimlar sheet → username
  var myRecords   = [];

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][1]) === String(tgId)) {
      var rowTgId = String(values[i][1] || '').trim();
      myRecords.push({
        rowId:     i + 1,
        name:      usernameMap[rowTgId] || String(values[i][0] || ''),
        amountUZS: Number(values[i][2]) || 0,
        amountUSD: Number(values[i][3]) || 0,
        rate:      Number(values[i][4]) || 0,
        comment:   String(values[i][5] || ''),
        date:      formatDateCell(values[i][6])
      });
    }
  }

  var emp = getEmployee(tgId);
  return {
    success:      true,
    data:         myRecords,
    username:     auth.username,
    canAdd:       auth.canAdd,
    role:         auth.role,
    isAdmin:      auth.isAdmin,
    isBoss:       auth.isBoss,
    isSuperAdmin: auth.isSuperAdmin,
    isDirector:   auth.isDirector,
    isDirektor:   auth.isDirector,
    permissions:  auth.permissions,
    inList:       emp !== null   // Ro'yxatda bormi
  };
}


// ---- Hodimlar username map (telegramId → username) ----
function buildUsernameMap() {
  var empSheet = getSheets().empSheet;
  var rows     = empSheet.getDataRange().getValues();
  var map      = {};
  for (var i = 1; i < rows.length; i++) {
    var tgId  = String(rows[i][COL.TG_ID]   || '').trim();
    var uname = String(rows[i][COL.USERNAME] || '').trim();
    if (tgId && uname) map[tgId] = uname;
  }
  return map;
}

function addRecord(data, auth) {
  // Ruhsatni backend da ham tekshiramiz
  if (!auth.canAdd) {
    return { success: false, error: "Sizda amal qo'shish ruxsati yo'q!" };
  }

  var dataSheet = getSheets().dataSheet;
  var emp       = getEmployee(String(data.telegramId));

  // Ko'rsatiladigan ism — username (laqab) yoki Telegram ismi
  var displayName = (emp && emp.username) ? emp.username : (data.employeeName || '');

  var parsedDate = parseDateInput_(data.date, data.dateISO);
  if (!parsedDate) parsedDate = parseDateInput_(new Date(), null);

  dataSheet.appendRow([
    displayName,
    data.telegramId   || '',
    Number(data.amountUZS) || 0,
    Number(data.amountUSD) || 0,
    Number(data.rate)      || 0,
    data.comment      || '',
    parsedDate.dateObj
  ]);
  dataSheet.getRange(dataSheet.getLastRow(), 7).setNumberFormat('dd/MM/yyyy');

  sendTelegramNotification({
    employeeName: displayName,
    amountUZS: Number(data.amountUZS) || 0,
    amountUSD: Number(data.amountUSD) || 0,
    rate: Number(data.rate) || 0,
    comment: data.comment || '',
    date: parsedDate.display
  });
  return { success: true };
}

function adminGetAll() {
  var dataSheet   = getSheets().dataSheet;
  var values      = dataSheet.getDataRange().getValues();
  var usernameMap = buildUsernameMap();   // Hodimlar sheet → username
  var result      = [];
  for (var i = values.length - 1; i > 0; i--) {
    if (!values[i][0] && !values[i][2]) continue;
    var rowTgId = String(values[i][1] || '').trim();
    result.push({
      rowId:     i + 1,
      name:      usernameMap[rowTgId] || String(values[i][0] || ''),
      telegramId:String(values[i][1] || ''),
      amountUZS: Number(values[i][2]) || 0,
      amountUSD: Number(values[i][3]) || 0,
      rate:      Number(values[i][4]) || 0,
      comment:   String(values[i][5] || ''),
      date:      formatDateCell(values[i][6])
    });
  }
  return { success: true, data: result };
}

function adminEditRecord(data) {
  var dataSheet = getSheets().dataSheet;
  var row = parseInt(data.rowId);
  dataSheet.getRange(row, 3).setValue(Number(data.amountUZS) || 0);
  dataSheet.getRange(row, 4).setValue(Number(data.amountUSD) || 0);
  dataSheet.getRange(row, 5).setValue(Number(data.rate)      || 0);
  dataSheet.getRange(row, 6).setValue(data.comment           || '');
  return { success: true };
}

function adminDeleteRecord(rowId) {
  getSheets().dataSheet.deleteRow(parseInt(rowId));
  return { success: true };
}

// ============================================================
// HODIMLAR BOSHQARUVI (SuperAdmin uchun)
// ============================================================

function getHodimlar() {
  var empSheet = getSheets().empSheet;
  var rows     = empSheet.getDataRange().getValues();
  var result   = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    result.push({
      sheetRow:    i + 1,
      tgId:        String(rows[i][COL.TG_ID]),
      username:    String(rows[i][COL.USERNAME]    || ''),
      canAdd:      Number(rows[i][COL.CAN_ADD])    || 0,
      isSuperAdmin:Number(rows[i][COL.SUPER_ADMIN])|| 0,
      isDirektor:  Number(rows[i][COL.DIREKTOR])   || 0,
      isAdmin:     Number(rows[i][COL.ADMIN])      || 0,
      canViewAll:  Number(rows[i][COL.VIEW_ALL])   || 0,
      canEdit:     Number(rows[i][COL.EDIT])       || 0,
      canDelete:   Number(rows[i][COL.DELETE])     || 0,
      canExport:   Number(rows[i][COL.EXPORT])     || 0,
      canViewDash: Number(rows[i][COL.VIEW_DASH])  || 0
    });
  }
  return { success: true, data: result };
}

function addHodim(data) {
  var empSheet = getSheets().empSheet;
  var rows     = empSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.tgId)) {
      return { success: false, error: "Bu ID allaqachon ro'yxatda!" };
    }
  }
  empSheet.appendRow([
    data.tgId        || '',
    data.username    || 'Yangi Xodim',
    data.canAdd      || 0,
    data.isSuperAdmin|| 0,
    data.isDirektor  || 0,
    data.isAdmin     || 0,
    data.canViewAll  || 0,
    data.canEdit     || 0,
    data.canDelete   || 0,
    data.canExport   || 0,
    data.canViewDash || 0
  ]);
  return { success: true };
}

function updateHodim(data) {
  var empSheet = getSheets().empSheet;
  var rows     = empSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.tgId)) {
      var r = i + 1;
      empSheet.getRange(r, COL.USERNAME     + 1).setValue(data.username    || '');
      empSheet.getRange(r, COL.CAN_ADD      + 1).setValue(data.canAdd      || 0);
      empSheet.getRange(r, COL.SUPER_ADMIN  + 1).setValue(data.isSuperAdmin|| 0);
      empSheet.getRange(r, COL.DIREKTOR     + 1).setValue(data.isDirektor  || 0);
      empSheet.getRange(r, COL.ADMIN        + 1).setValue(data.isAdmin     || 0);
      empSheet.getRange(r, COL.VIEW_ALL     + 1).setValue(data.canViewAll  || 0);
      empSheet.getRange(r, COL.EDIT         + 1).setValue(data.canEdit     || 0);
      empSheet.getRange(r, COL.DELETE       + 1).setValue(data.canDelete   || 0);
      empSheet.getRange(r, COL.EXPORT       + 1).setValue(data.canExport   || 0);
      empSheet.getRange(r, COL.VIEW_DASH    + 1).setValue(data.canViewDash || 0);
      return { success: true };
    }
  }
  return { success: false, error: "Hodim topilmadi" };
}

function deleteHodim(tgId) {
  var empSheet = getSheets().empSheet;
  var rows     = empSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(tgId)) {
      empSheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: "Hodim topilmadi" };
}
