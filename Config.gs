// ============================================================
// CONFIG.GS
// ============================================================
var CONFIG = {
  BOT_TOKEN:        "YOUR_BOT_TOKEN",      // @BotFather dan
  CHAT_ID:          "YOUR_TG_CHAT_ID",            // Xabarnomalar uchun
  SUPER_ADMIN_ID:   "YOUR_TG_ADMIN_CHAT_ID",             // Sizning Telegram ID
  SUPER_ADMIN_NAME: "SuperAdmin",            // Ko'rsatiladigan ism
  WEB_APP_URL:      "https://YOUR.github.io/ishhaqibottest/"
};

function sendJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
                       .setMimeType(ContentService.MimeType.JSON);
}
