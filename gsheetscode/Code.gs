// ============================================================
// CODE.GS
// ============================================================

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: "API ishlayapti ✅" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var rawBody = '';
  var body = {};
  var action = '';
  var tgId = '';

  try {
    rawBody = e && e.postData && e.postData.contents ? String(e.postData.contents) : '{}';
    body = JSON.parse(rawBody || '{}');

    // Telegram webhook — ignore (webhook o'chirilgan)
    if (body.update_id) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Web App so'rovi
    var data   = body;
    action = String(data.action || '');
    tgId   = String(data.telegramId || '');
    if (!action) {
      return sendJSON({ success:false, error:"Action yuborilmadi" });
    }
    var authValidation = validateTelegramAuth(data, tgId);
    if (!authValidation.success) {
      return sendJSON({ success:false, error: authValidation.error });
    }
    var rateLimit = checkRateLimit_(tgId, action);
    if (!rateLimit.success) {
      return sendJSON(rateLimit);
    }
    var auth   = checkUserRoles(tgId);
    var result;

    switch (action) {

      case "init":
        result = initUser(tgId, auth);
        break;

      case "add":
        result = addRecord(data, auth, tgId);
        break;

      case "admin_get_all":
        var canView = auth.isSuperAdmin || auth.isDirector ||
                     (auth.isAdmin && auth.permissions.canViewAll);
        if (!canView) return sendJSON({ success:false, error:"Ko'rish ruxsati yo'q!" });
        result = adminGetAll(data);
        break;

      case "admin_edit":
        var canEdit = auth.isSuperAdmin ||
                     (auth.isAdmin && auth.permissions.canEdit);
        if (!canEdit) return sendJSON({ success:false, error:"Tahrirlash ruxsati yo'q!" });
        result = adminEditRecord(data, tgId);
        break;

      case "admin_delete":
        var canDel = auth.isSuperAdmin ||
                    (auth.isAdmin && auth.permissions.canDelete);
        if (!canDel) return sendJSON({ success:false, error:"O'chirish ruxsati yo'q!" });
        result = adminDeleteRecord(data.rowId, tgId);
        break;

      // ---- Hodimlar boshqaruvi (SuperAdmin) ----
      case "get_hodimlar":
        if (!auth.isSuperAdmin) return sendJSON({ success:false, error:"Faqat SuperAdmin!" });
        result = getHodimlar();
        break;

      case "add_hodim":
        if (!auth.isSuperAdmin) return sendJSON({ success:false, error:"Faqat SuperAdmin!" });
        result = addHodim(data);
        break;

      case "update_hodim":
        if (!auth.isSuperAdmin) return sendJSON({ success:false, error:"Faqat SuperAdmin!" });
        result = updateHodim(data);
        break;

      case "delete_hodim":
        if (!auth.isSuperAdmin) return sendJSON({ success:false, error:"Faqat SuperAdmin!" });
        result = deleteHodim(data.tgId);
        break;

      case "export_to_bot":
        var canExp = auth.canAdd || auth.isSuperAdmin || auth.isDirector ||
                    (auth.isAdmin && auth.permissions.canExport);
        if (!canExp) return sendJSON({ success:false, error:"Excel ruxsati yo'q!" });
        var res = sendExcelToUser(tgId, data.base64, data.fileName);
        result  = { success: res.ok, error: res.description };
        break;

      default:
        result = { success: false, error: "Noma'lum: " + action };
    }

    return sendJSON(result);

  } catch(err) {
    addErrorLog_({
      action: action || (body && body.action),
      tgId: tgId || (body && body.telegramId),
      rawBody: rawBody,
      error: err
    });
    return sendJSON({ success: false, error: err.toString() });
  }
}

// Webhook o'chirish
function deleteWebhook() {
  var url = 'https://api.telegram.org/bot' + CONFIG.BOT_TOKEN +
            '/deleteWebhook?drop_pending_updates=true';
  Logger.log(UrlFetchApp.fetch(url).getContentText());
}

function checkRateLimit_(tgId, action) {
  var ttl = getRateLimitSeconds_(action);
  if (ttl <= 0) return { success:true };

  var cache;
  try {
    cache = CacheService.getScriptCache();
  } catch (e) {
    return { success:true };
  }
  if (!cache) return { success:true };

  var key = 'rl:' + String(tgId || '0') + ':' + String(action || '');
  try {
    if (cache.get(key)) {
      return { success:false, error:"Juda tez so'rov yuborildi. 2 soniya kuting." };
    }
    cache.put(key, '1', ttl);
  } catch (e2) {
    return { success:true };
  }
  return { success:true };
}

function getRateLimitSeconds_(action) {
  if (CONFIG && CONFIG.RATE_LIMIT_ENABLED === false) return 0;
  var a = String(action || '');
  if (a === 'add' || a === 'admin_edit' || a === 'admin_delete' ||
      a === 'add_hodim' || a === 'update_hodim' || a === 'delete_hodim') return 2;
  if (a === 'export_to_bot') return 5;
  return 0;
}

function getErrorSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('ErrorLog');
  if (!sh) {
    sh = ss.insertSheet('ErrorLog');
    sh.appendRow(['Timestamp', 'Action', 'TelegramId', 'Error', 'Stack', 'RawBody']);
    sh.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  return sh;
}

function truncateForLog_(value, maxLen) {
  var str = String(value || '');
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

function addErrorLog_(ctx) {
  try {
    var sh = getErrorSheet_();
    var errObj = ctx && ctx.error ? ctx.error : null;
    var errText = errObj ? String(errObj) : '';
    var stack = errObj && errObj.stack ? String(errObj.stack) : '';
    sh.appendRow([
      new Date(),
      String((ctx && ctx.action) || ''),
      String((ctx && ctx.tgId) || ''),
      truncateForLog_(errText, 1000),
      truncateForLog_(stack, 4000),
      truncateForLog_((ctx && ctx.rawBody) || '', 2000)
    ]);
  } catch (ignore) {}
}

function validateTelegramAuth(data, tgId) {
  var requireAuth = CONFIG.REQUIRE_TELEGRAM_AUTH === true;
  var initData = data && data.initData ? String(data.initData) : '';

  if (!initData) {
    if (requireAuth) {
      return { success:false, error:"Telegram auth topilmadi" };
    }
    return { success:true };
  }

  var verified = verifyTelegramInitData_(initData, CONFIG.BOT_TOKEN, tgId);
  if (!verified.success) return verified;
  return { success:true };
}

function verifyTelegramInitData_(initData, botToken, expectedTgId) {
  if (!botToken) return { success:false, error:"BOT_TOKEN sozlanmagan" };

  var params = parseInitData_(initData);
  var theirHash = params.hash;
  if (!theirHash) return { success:false, error:"Telegram hash topilmadi" };
  delete params.hash;

  var keys = Object.keys(params).sort();
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    parts.push(keys[i] + '=' + params[keys[i]]);
  }
  var dataCheckString = parts.join('\n');

  var secretKey = Utilities.computeHmacSha256Signature(botToken, 'WebAppData');
  var dataCheckBytes = Utilities.newBlob(dataCheckString).getBytes();
  var calcHashBytes = Utilities.computeHmacSha256Signature(dataCheckBytes, secretKey);
  var calcHash = toHex_(calcHashBytes);

  if (calcHash !== String(theirHash).toLowerCase()) {
    return { success:false, error:"Telegram auth xato (hash mismatch)" };
  }

  var maxAge = Number(CONFIG.AUTH_MAX_AGE_SEC || 0);
  if (maxAge > 0 && params.auth_date) {
    var nowSec = Math.floor(Date.now() / 1000);
    var authSec = Number(params.auth_date);
    if (isFinite(authSec) && nowSec - authSec > maxAge) {
      return { success:false, error:"Telegram auth eskirgan" };
    }
  }

  if (expectedTgId && params.user) {
    try {
      var userObj = JSON.parse(params.user);
      if (String(userObj.id) !== String(expectedTgId)) {
        return { success:false, error:"Telegram foydalanuvchi mos emas" };
      }
    } catch (e) {
      return { success:false, error:"Telegram user format xato" };
    }
  }

  return { success:true };
}

function parseInitData_(raw) {
  var out = {};
  if (!raw) return out;
  var pairs = String(raw).split('&');
  for (var i = 0; i < pairs.length; i++) {
    if (!pairs[i]) continue;
    var eq = pairs[i].indexOf('=');
    var key = eq >= 0 ? pairs[i].slice(0, eq) : pairs[i];
    var val = eq >= 0 ? pairs[i].slice(eq + 1) : '';
    key = decodeURIComponent_(key);
    val = decodeURIComponent_(val);
    out[key] = val;
  }
  return out;
}

function decodeURIComponent_(s) {
  try {
    return decodeURIComponent(String(s).replace(/\+/g, '%20'));
  } catch (e) {
    return String(s);
  }
}

function toHex_(bytes) {
  var out = [];
  for (var i = 0; i < bytes.length; i++) {
    var v = (bytes[i] + 256) % 256;
    out.push((v < 16 ? '0' : '') + v.toString(16));
  }
  return out.join('');
}
