// ============================================================
// config.js — Frontend sozlamalari
// ============================================================
const API_URL = "https://script.google.com/macros/s/AKfycbwXgZ13q3qzNdtj6iKd5LKvYapN-raKMDB9EAVkA4dwAdjK2hGkQVz202zUbfbKeJAkoA/exec";

const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor && tg.setHeaderColor('#0F172A');

const user         = tg.initDataUnsafe?.user;
const employeeName = user ? `${user.first_name} ${user.last_name || ''}`.trim() : "Test User";
const telegramId   = user ? String(user.id) : "0";

// Global state
let globalAdminData   = [];
let filteredData      = [];
let myFullRecords     = [];
let myFilteredRecords = [];
let currentPage       = 1;
const ITEMS_PER_PAGE  = 10;

let myRole       = 'User';
let myUsername   = '';   // Sheetdan kelgan laqab
let myCanAdd     = true; // + tugmasi doim ko'rinadi, ruxsat yo'q bo'lsa ogohlantirish
let myInList     = false;// Hodimlar sheetida bormi

let myPermissions = {
  canViewAll:false, canEdit:false,
  canDelete:false, canExport:false, canViewDash:false
};

// Keep template rendering safe when using innerHTML with server-provided values.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Parse date safely without locale ambiguity.
// Priority: ISO -> DD/MM/YYYY (also supports DD.MM.YYYY and DD-MM-YYYY).
function parseDateParts(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str || str === 'undefined' || str === 'null') return null;

  let day = '';
  let month = '';
  let year = '';

  // ISO date and ISO datetime
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(str)) {
    year = str.slice(0, 4);
    month = str.slice(5, 7);
    day = str.slice(8, 10);
  } else {
    // DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY
    const m = str.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (m) {
      day = m[1].padStart(2, '0');
      month = m[2].padStart(2, '0');
      year = m[3];
    } else if (/^\d{5}(?:\.\d+)?$/.test(str)) {
      // Excel serial date fallback
      const serial = Math.floor(Number(str));
      const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      year = String(utc.getUTCFullYear());
      month = String(utc.getUTCMonth() + 1).padStart(2, '0');
      day = String(utc.getUTCDate()).padStart(2, '0');
    } else {
      return null;
    }
  }

  const y = Number(year);
  const mNum = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || year.length !== 4) return null;
  if (!Number.isInteger(mNum) || mNum < 1 || mNum > 12) return null;
  if (!Number.isInteger(d) || d < 1 || d > 31) return null;

  // Strict calendar validation (e.g., reject 31/02/2026)
  const check = new Date(Date.UTC(y, mNum - 1, d));
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== mNum - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }

  return {
    day,
    month,
    year,
    iso: `${year}-${month}-${day}`,
    display: `${day}/${month}/${year}`
  };
}

function getDateMonthYear(value) {
  const parsed = parseDateParts(value);
  if (!parsed) return null;
  return { month: parsed.month, year: parsed.year };
}

function getTodayDdMmYyyy(now = new Date()) {
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  return {
    day,
    month,
    year,
    display: `${day}/${month}/${year}`,
    iso: `${year}-${month}-${day}`
  };
}
