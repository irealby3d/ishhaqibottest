// =========================================================
// ⚠️ DIQQAT! GOOGLE SCRIPT SSILKASINI SHU YERGA QO'YASIZ!
// =========================================================
const API_URL = "https://script.google.com/macros/s/AKfycbyELe4JB8a4NpmaZr2wlonnOwu9gDIkumw3JEu2VuMyl--pwImUrcvkG4e5H1GnONk9Pw/exec";

const tg = window.Telegram.WebApp;
tg.expand();

const user         = tg.initDataUnsafe?.user;
const employeeName = user ? `${user.first_name} ${user.last_name || ''}`.trim() : "Test User";
const telegramId   = user ? String(user.id) : "Yo'q";

// Global state
let globalAdminData   = [];
let filteredData      = [];
let myFullRecords     = [];
let myFilteredRecords = [];
let currentPage       = 1;
const ITEMS_PER_PAGE  = 10;

// Rollar:
// 'SuperAdmin' — to'liq huquq (Boss)
// 'Admin'      — faqat o'zini dashboardi + ruhsat berilgan amalni ko'rish/tahrirlash/o'chirish
// 'Direktor'   — barcha amallarni ko'radi, yuklab oladi, dashboard, LEKIN tahrirlash/o'chirish yo'q
// 'User'       — faqat o'z amallar + o'z dashboardi
let myRole = 'User';

// Admin ruhsatlari (backend dan keladi)
let myPermissions = {
    canViewAll:   false,  // barcha xodimlar amallarini ko'rish
    canEdit:      false,  // tahrirlash
    canDelete:    false,  // o'chirish
    canExport:    false,  // excel yuklab olish
    canViewDashboard: false, // dashboard
};