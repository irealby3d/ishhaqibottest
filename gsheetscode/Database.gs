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

var DATA_COL = {
  NAME: 0,
  TG_ID: 1,
  AMOUNT_UZS: 2,
  AMOUNT_USD: 3,
  RATE: 4,
  COMMENT: 5,
  DATE: 6,
  IS_DELETED: 7
};

var _MEMO = {
  sheets: null,
  empRows: null,
  usernameMap: null
};

function getSheets() {
  if (_MEMO.sheets) return _MEMO.sheets;

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Data sheet — birinchi varaq
  var dataSheet = ss.getSheets()[0];
  ensureDataInfrastructure_(dataSheet);

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
  _MEMO.sheets = { dataSheet: dataSheet, empSheet: empSheet };
  return _MEMO.sheets;
}

function ensureDataInfrastructure_(dataSheet) {
  if (!dataSheet) return;
  if (dataSheet.getMaxColumns() < 8) {
    dataSheet.insertColumnsAfter(dataSheet.getMaxColumns(), 8 - dataSheet.getMaxColumns());
  }

  var header = dataSheet.getRange(1, 1, 1, 8).getValues()[0];
  if (!header[DATA_COL.IS_DELETED]) {
    dataSheet.getRange(1, DATA_COL.IS_DELETED + 1).setValue('IsDeleted');
  }
}

function getAuditSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('AuditLog');
  if (!sh) {
    sh = ss.insertSheet('AuditLog');
    sh.appendRow(['Timestamp', 'ActorTgId', 'Action', 'RowId', 'Before', 'After', 'Note']);
    sh.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
  return sh;
}

function addAuditLog_(actorTgId, action, rowId, beforeObj, afterObj, note) {
  var sh = getAuditSheet_();
  sh.appendRow([
    new Date(),
    String(actorTgId || ''),
    String(action || ''),
    String(rowId || ''),
    JSON.stringify(beforeObj || {}),
    JSON.stringify(afterObj || {}),
    String(note || '')
  ]);
}

function getEmployeeRows_() {
  if (_MEMO.empRows) return _MEMO.empRows;
  _MEMO.empRows = getSheets().empSheet.getDataRange().getValues();
  return _MEMO.empRows;
}

function resetEmployeeCache_() {
  _MEMO.empRows = null;
  _MEMO.usernameMap = null;
}

function isDeletedRow_(row) {
  var mark = row[DATA_COL.IS_DELETED];
  if (mark === 1 || mark === true) return true;
  var s = String(mark || '').toLowerCase().trim();
  return s === '1' || s === 'true' || s === 'yes';
}

function rowToRecordForAudit_(row) {
  return {
    name: String(row[DATA_COL.NAME] || ''),
    telegramId: String(row[DATA_COL.TG_ID] || ''),
    amountUZS: Number(row[DATA_COL.AMOUNT_UZS]) || 0,
    amountUSD: Number(row[DATA_COL.AMOUNT_USD]) || 0,
    rate: Number(row[DATA_COL.RATE]) || 0,
    comment: String(row[DATA_COL.COMMENT] || ''),
    date: formatDateCell(row[DATA_COL.DATE]),
    isDeleted: Number(row[DATA_COL.IS_DELETED]) || 0
  };
}

function withWriteLock_(handler) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return { success:false, error:"Server band. 2-3 soniyadan keyin qayta urinib ko'ring." };
  }
  try {
    return handler();
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function toPositiveInt_(value, defaultValue, minValue, maxValue) {
  var n = parseInt(value, 10);
  if (!isFinite(n) || n < minValue) return defaultValue;
  if (n > maxValue) return maxValue;
  return n;
}

function normalizeFilterText_(value) {
  return String(value || '').toLowerCase().trim();
}

function matchesAdminFilters_(name, comment, dateMeta, filters) {
  var f = filters || {};
  var employee = String(f.employee || 'all');
  var month = String(f.month || 'all');
  var year = String(f.year || 'all');
  var query = normalizeFilterText_(f.query);

  if (employee !== 'all' && name !== employee) return false;

  if (query) {
    var n = normalizeFilterText_(name);
    var c = normalizeFilterText_(comment);
    if (n.indexOf(query) < 0 && c.indexOf(query) < 0) return false;
  }

  if (month !== 'all' || year !== 'all') {
    if (!dateMeta) return false;
    if (month !== 'all' && dateMeta.month !== month) return false;
    if (year !== 'all' && dateMeta.year !== year) return false;
  }

  return true;
}

// ---- Hodim ma'lumotlarini olish ----
function getEmployee(tgId) {
  var rows = getEmployeeRows_();
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
    if (isDeletedRow_(values[i])) continue;
    if (String(values[i][DATA_COL.TG_ID]) === String(tgId)) {
      var rowTgId = String(values[i][DATA_COL.TG_ID] || '').trim();
      myRecords.push({
        rowId:     i + 1,
        name:      usernameMap[rowTgId] || String(values[i][DATA_COL.NAME] || ''),
        amountUZS: Number(values[i][DATA_COL.AMOUNT_UZS]) || 0,
        amountUSD: Number(values[i][DATA_COL.AMOUNT_USD]) || 0,
        rate:      Number(values[i][DATA_COL.RATE]) || 0,
        comment:   String(values[i][DATA_COL.COMMENT] || ''),
        date:      formatDateCell(values[i][DATA_COL.DATE])
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
  if (_MEMO.usernameMap) return _MEMO.usernameMap;
  var rows     = getEmployeeRows_();
  var map      = {};
  for (var i = 1; i < rows.length; i++) {
    var tgId  = String(rows[i][COL.TG_ID]   || '').trim();
    var uname = String(rows[i][COL.USERNAME] || '').trim();
    if (tgId && uname) map[tgId] = uname;
  }
  _MEMO.usernameMap = map;
  return map;
}

function addRecord(data, auth, actorTgId) {
  // Ruhsatni backend da ham tekshiramiz
  if (!auth.canAdd) {
    return { success: false, error: "Sizda amal qo'shish ruxsati yo'q!" };
  }

  var notifyPayload = null;

  var writeResult = withWriteLock_(function () {
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
      parsedDate.dateObj,
      0
    ]);

    var row = dataSheet.getLastRow();
    dataSheet.getRange(row, 7).setNumberFormat('dd/MM/yyyy');
    dataSheet.getRange(row, 8).setNumberFormat('0');

    var appendedValues = dataSheet.getRange(row, 1, 1, 8).getValues()[0];
    addAuditLog_(actorTgId, 'add_record', row, null, rowToRecordForAudit_(appendedValues), 'created');

    notifyPayload = {
      employeeName: displayName,
      amountUZS: Number(data.amountUZS) || 0,
      amountUSD: Number(data.amountUSD) || 0,
      rate: Number(data.rate) || 0,
      comment: data.comment || '',
      date: parsedDate.display
    };

    return { success: true };
  });

  if (!writeResult.success) return writeResult;
  if (notifyPayload) sendTelegramNotification(notifyPayload);
  return writeResult;
}

function adminGetAll(options) {
  var opts = options || {};

  var dataSheet   = getSheets().dataSheet;
  var values      = dataSheet.getDataRange().getValues();
  var usernameMap = buildUsernameMap();

  var records = [];
  var totalUZS = 0;
  var employeeSet = {};
  var yearSet = {};

  for (var i = values.length - 1; i > 0; i--) {
    var row = values[i];
    if (isDeletedRow_(row)) continue;
    if (!row[DATA_COL.NAME] && !row[DATA_COL.AMOUNT_UZS]) continue;

    var rowTgId = String(row[DATA_COL.TG_ID] || '').trim();
    var name = usernameMap[rowTgId] || String(row[DATA_COL.NAME] || '');
    var comment = String(row[DATA_COL.COMMENT] || '');
    var dateMeta = parseDateInput_(row[DATA_COL.DATE], null);
    var dateText = dateMeta ? dateMeta.display : formatDateCell(row[DATA_COL.DATE]);

    if (name) employeeSet[name] = true;
    if (dateMeta) yearSet[dateMeta.year] = true;

    if (!matchesAdminFilters_(name, comment, dateMeta, opts)) continue;

    var amountUZS = Number(row[DATA_COL.AMOUNT_UZS]) || 0;
    totalUZS += amountUZS;

    records.push({
      rowId:     i + 1,
      name:      name,
      telegramId:String(row[DATA_COL.TG_ID] || ''),
      amountUZS: amountUZS,
      amountUSD: Number(row[DATA_COL.AMOUNT_USD]) || 0,
      rate:      Number(row[DATA_COL.RATE]) || 0,
      comment:   comment,
      date:      dateText
    });
  }

  var employees = Object.keys(employeeSet).sort();
  var years = Object.keys(yearSet).sort(function (a, b) { return Number(b) - Number(a); });

  var pageGiven = opts.page !== undefined && opts.page !== null && String(opts.page).trim() !== '';
  var pageSizeGiven = opts.pageSize !== undefined && opts.pageSize !== null && String(opts.pageSize).trim() !== '';
  var shouldPaginate = pageGiven || pageSizeGiven;

  if (!shouldPaginate) {
    return {
      success: true,
      data: records,
      totalCount: records.length,
      totalUZS: totalUZS,
      employees: employees,
      years: years
    };
  }

  var pageSize = toPositiveInt_(opts.pageSize, 20, 5, 100);
  var totalCount = records.length;
  var totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  var page = toPositiveInt_(opts.page, 1, 1, totalPages);
  if (page > totalPages) page = totalPages;

  var start = (page - 1) * pageSize;
  var pageData = records.slice(start, start + pageSize);

  return {
    success: true,
    data: pageData,
    page: page,
    pageSize: pageSize,
    totalPages: totalPages,
    totalCount: totalCount,
    totalUZS: totalUZS,
    employees: employees,
    years: years
  };
}

function adminEditRecord(data, actorTgId) {
  return withWriteLock_(function () {
    var dataSheet = getSheets().dataSheet;
    var row = parseInt(data.rowId, 10);
    if (!row || row <= 1 || row > dataSheet.getLastRow()) {
      return { success:false, error:'Qator topilmadi' };
    }

    var before = dataSheet.getRange(row, 1, 1, 8).getValues()[0];
    if (isDeletedRow_(before)) {
      return { success:false, error:"Bu yozuv o'chirilgan" };
    }

    dataSheet.getRange(row, 3).setValue(Number(data.amountUZS) || 0);
    dataSheet.getRange(row, 4).setValue(Number(data.amountUSD) || 0);
    dataSheet.getRange(row, 5).setValue(Number(data.rate)      || 0);
    dataSheet.getRange(row, 6).setValue(data.comment           || '');

    var after = dataSheet.getRange(row, 1, 1, 8).getValues()[0];
    addAuditLog_(actorTgId, 'admin_edit', row, rowToRecordForAudit_(before), rowToRecordForAudit_(after), 'updated');
    return { success: true };
  });
}

function adminDeleteRecord(rowId, actorTgId) {
  return withWriteLock_(function () {
    var dataSheet = getSheets().dataSheet;
    var row = parseInt(rowId, 10);
    if (!row || row <= 1 || row > dataSheet.getLastRow()) {
      return { success:false, error:'Qator topilmadi' };
    }

    var before = dataSheet.getRange(row, 1, 1, 8).getValues()[0];
    if (isDeletedRow_(before)) {
      return { success:true };
    }

    dataSheet.getRange(row, DATA_COL.IS_DELETED + 1).setValue(1);
    var after = dataSheet.getRange(row, 1, 1, 8).getValues()[0];
    addAuditLog_(actorTgId, 'admin_delete', row, rowToRecordForAudit_(before), rowToRecordForAudit_(after), 'soft-delete');
    return { success: true };
  });
}

// ============================================================
// HODIMLAR BOSHQARUVI (SuperAdmin uchun)
// ============================================================

function getHodimlar() {
  var rows     = getEmployeeRows_();
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
  return withWriteLock_(function () {
    var empSheet = getSheets().empSheet;
    var rows     = getEmployeeRows_();
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
    resetEmployeeCache_();
    return { success: true };
  });
}

function updateHodim(data) {
  return withWriteLock_(function () {
    var empSheet = getSheets().empSheet;
    var rows     = getEmployeeRows_();
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
        resetEmployeeCache_();
        return { success: true };
      }
    }
    return { success: false, error: "Hodim topilmadi" };
  });
}

function deleteHodim(tgId) {
  return withWriteLock_(function () {
    var empSheet = getSheets().empSheet;
    var rows     = getEmployeeRows_();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(tgId)) {
        empSheet.deleteRow(i + 1);
        resetEmployeeCache_();
        return { success: true };
      }
    }
    return { success: false, error: "Hodim topilmadi" };
  });
}
