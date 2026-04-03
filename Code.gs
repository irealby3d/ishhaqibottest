// ============================================================
// CODE.GS
// ============================================================

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: "API ishlayapti ✅" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // Telegram webhook — ignore (webhook o'chirilgan)
    if (body.update_id) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Web App so'rovi
    var data   = body;
    var action = data.action;
    var tgId   = String(data.telegramId);
    var auth   = checkUserRoles(tgId);
    var result;

    switch (action) {

      case "init":
        result = initUser(tgId, auth);
        break;

      case "add":
        result = addRecord(data, auth);
        break;

      case "admin_get_all":
        var canView = auth.isSuperAdmin || auth.isDirector ||
                     (auth.isAdmin && auth.permissions.canViewAll);
        if (!canView) return sendJSON({ success:false, error:"Ko'rish ruxsati yo'q!" });
        result = adminGetAll();
        break;

      case "admin_edit":
        var canEdit = auth.isSuperAdmin ||
                     (auth.isAdmin && auth.permissions.canEdit);
        if (!canEdit) return sendJSON({ success:false, error:"Tahrirlash ruxsati yo'q!" });
        result = adminEditRecord(data);
        break;

      case "admin_delete":
        var canDel = auth.isSuperAdmin ||
                    (auth.isAdmin && auth.permissions.canDelete);
        if (!canDel) return sendJSON({ success:false, error:"O'chirish ruxsati yo'q!" });
        result = adminDeleteRecord(data.rowId);
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
    return sendJSON({ success: false, error: err.toString() });
  }
}

// Webhook o'chirish
function deleteWebhook() {
  var url = 'https://api.telegram.org/bot' + CONFIG.BOT_TOKEN +
            '/deleteWebhook?drop_pending_updates=true';
  Logger.log(UrlFetchApp.fetch(url).getContentText());
}
