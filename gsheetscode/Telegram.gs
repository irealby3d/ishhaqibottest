// ============================================================
// TELEGRAM.GS — Telegram Bot API
// ============================================================

// Yangi amal qo'shilganda xabarnoma yuborish
function sendTelegramNotification(data) {
  var uzsText = Number(data.amountUZS) > 0 ? "\n💰 " + Number(data.amountUZS).toLocaleString() + " UZS" : "";
  var usdText = Number(data.amountUSD) > 0 ? "\n💵 $" + Number(data.amountUSD).toLocaleString() : "";
  var rateText= Number(data.amountUSD) > 0 && Number(data.rate) > 0
                ? "\n📈 Kurs: " + Number(data.rate).toLocaleString() + " UZS" : "";

  var msg = "✅ <b>Yangi amal qo'shildi</b>\n" +
            "👤 " + (data.employeeName || "—") +
            uzsText + usdText + rateText +
            "\n📝 " + (data.comment || "—") +
            "\n📅 " + (data.date    || "—");

  var url     = "https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/sendMessage";
  var options = {
    method:          "post",
    contentType:     "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify({
      chat_id:    CONFIG.CHAT_ID,
      text:       msg,
      parse_mode: "HTML"
    })
  };
  UrlFetchApp.fetch(url, options);
}

// Excel faylni foydalanuvchiga yuborish
function sendExcelToUser(tgId, base64Data, fileName) {
  var url     = "https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/sendDocument";
  var decoded = Utilities.base64Decode(base64Data);
  var blob    = Utilities.newBlob(
    decoded,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileName
  );

  var options = {
    method:             "post",
    payload:            { chat_id: String(tgId), document: blob, caption: "📊 " + fileName },
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}
