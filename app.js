// =========================================================
// ⚠️ DIQQAT! GOOGLE SCRIPT SSILKASINI SHU YERGA QO'YASIZ!
// =========================================================
const API_URL = "https://script.google.com/macros/s/AKfycbyELe4JB8a4NpmaZr2wlonnOwu9gDIkumw3JEu2VuMyl--pwImUrcvkG4e5H1GnONk9Pw/exec"; 

const tg = window.Telegram.WebApp;
tg.expand();

// Foydalanuvchi ma'lumotlarini Telegramdan avtomatik olish
const user = tg.initDataUnsafe?.user;
const employeeName = user ? `${user.first_name} ${user.last_name || ''}`.trim() : "Test User";
const telegramId = user ? String(user.id) : "Yo'q";

let globalAdminData = []; 
let filteredData = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10; // Paginatsiya uchun bitta betda 10 ta
let myRole = 'User'; // Boshlang'ich rol

// ================= 1. DASTLABKI YUKLANISH =================
window.onload = async () => {
    document.getElementById('greeting').innerText = `Salom, ${user ? user.first_name : 'Xodim'}!`;
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "init", telegramId }) });
        const data = await res.json();
        
        if (data.success) {
            renderMyHistory(data.data);
            
            // Rolni aniqlaymiz
            if (data.isBoss) myRole = 'Boss';
            else if (data.isAdmin) myRole = 'Admin';
            else if (data.isDirector) myRole = 'Direktor'; // Direktor formati HTML da ham qo'shilgan

            // Rolga qarab menyularni ochish
            if (myRole !== 'User') {
                document.getElementById('nav-admin').classList.remove('hidden'); // BottomNav dagi Admin tugmasi
            }
            if (myRole === 'Boss') {
                document.getElementById('bossNav').classList.remove('hidden'); // Boss uchun Rollar menyusi
            }
        }
    } catch (e) { console.error("Xato:", e); }
};

// ================= 2. NAVIGATSIYA (Oynalarni almashtirish) =================
function switchTab(tabId, navId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if(navId !== 'nav-add') document.getElementById(navId).classList.add('active');
    
    if (tabId === 'adminTab') loadAdminData();
}

function switchAdminSub(areaId, btn) {
    document.getElementById('adminDataArea').classList.add('hidden');
    document.getElementById('adminRolesArea').classList.add('hidden');
    document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(areaId).classList.remove('hidden');
    btn.classList.add('active');
}

function toggleRate() { 
    const isUsd = document.getElementById('currency').value === 'USD';
    document.getElementById('rateDiv').classList.toggle('hidden', !isUsd);
}

// ================= 3. MENING HISOBOTIM =================
function renderMyHistory(records) {
    let tUZS = 0;           // Faqat so'mda kiritilganlar uchun
    let tUSD = 0;           // Faqat dollarda kiritilganlar uchun
    let tTotalBudget = 0;   // Umumiy budjet (Barchasi so'mda)
    let html = '';

    records.reverse().forEach(r => {
        const uzsVal = Number(r.amountUZS) || 0;
        const usdVal = Number(r.amountUSD) || 0;

        // 1. Umumiy budjetga hammani qo'shamiz (chunki amountUZS doim so'mda bo'ladi)
        tTotalBudget += uzsVal;

        // 2. Alohida hisoblagichlar uchun (Faqat vizual ajratish uchun)
        if (usdVal > 0) {
            tUSD += usdVal;
        } else {
            tUZS += uzsVal;
        }

        html += `<div class="history-item" style="flex-direction:column; align-items:stretch;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span style="font-weight:600;">${r.comment}</span>
                <span style="font-size:11px; color:#888;">📅 ${r.date}</span>
            </div>
            <div style="text-align:right;">
                ${uzsVal > 0 ? `<div style="color:#2e7d32; font-weight:bold;">${uzsVal.toLocaleString()} UZS</div>` : ''}
                ${usdVal > 0 ? `<div style="color:#e65100; font-weight:bold;">$${usdVal.toLocaleString()}</div>` : ''}
            </div>
        </div>`;
    });

    // Ekranga chiqarish
    document.getElementById('myUzs').innerText = tUZS.toLocaleString(); 
    document.getElementById('myUsd').innerText = '$' + tUSD.toLocaleString();
    document.getElementById('myTotalBudget').innerText = tTotalBudget.toLocaleString() + " UZS";
    document.getElementById('myHistory').innerHTML = html || "<p class='text-center text-gray'>Hali hech qanday xarajat yo'q</p>";
}
// ================= 4. YANGI XARAJAT QO'SHISH =================
document.getElementById('financeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn'); 
    const status = document.getElementById('status');
    
    let amount = parseFloat(document.getElementById('amount').value); 
    let currency = document.getElementById('currency').value;
    let rate = parseFloat(document.getElementById('rate').value) || 0; 
    let comment = document.getElementById('comment').value || "Izoh yo'q";
    
    let amountUZS = currency === 'USD' ? amount * rate : amount; 
    let amountUSD = currency === 'USD' ? amount : 0;
    
    if (currency === 'USD' && rate < 5000) return alert("Iltimos, to'g'ri kursni kiriting!");

    const date = new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());

    btn.disabled = true; btn.innerText = "Yuborilmoqda...";
    try {
        await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "add", employeeName, telegramId, amountUZS, amountUSD, rate, comment, date }) });
        status.style.color = "green"; status.innerText = "✅ Tizimga saqlandi!";
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) { 
        status.style.color = "red"; status.innerText = "❌ Xato yuz berdi";
        btn.disabled = false; btn.innerText = "Saqlash"; 
    }
});

// ================= 5. ADMIN/DIREKTOR BAZASI VA FILTRLAR =================
async function loadAdminData() {
    document.getElementById('adminList').innerHTML = "<p class='text-center'>Yuklanmoqda... ⏳</p>";
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "admin_get_all", telegramId }) });
        const data = await res.json();
        if (data.success) { 
            globalAdminData = data.data; 
            filteredData = [...globalAdminData];
            currentPage = 1;
            populateFilters(); // Select qutilarini xodimlar/yillar bilan to'ldirish
            calculateTotal();
            renderAdminPage(); 
        }
    } catch(e) {}
}

function populateFilters() {
    const empSelect = document.getElementById('filterEmployee');
    const yearSelect = document.getElementById('filterYear');
    let employees = new Set();
    let years = new Set();
    
    globalAdminData.forEach(r => {
        if(r.name) employees.add(r.name);
        if(r.date) years.add(r.date.split('/')[2]); // Sana formatidan yilni qirqib olish (DD/MM/YYYY)
    });

    empSelect.innerHTML = '<option value="all">Barcha xodimlar</option>';
    yearSelect.innerHTML = '<option value="all">Yillar</option>';

    Array.from(employees).sort().forEach(emp => empSelect.innerHTML += `<option value="${emp}">${emp}</option>`);
    Array.from(years).sort((a,b)=>b-a).forEach(y => yearSelect.innerHTML += `<option value="${y}">${y}</option>`);
}

let debounceTimer;
function applyFilters() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const query = document.getElementById('searchInput').value.toLowerCase();
        const emp = document.getElementById('filterEmployee').value;
        const month = document.getElementById('filterMonth').value;
        const year = document.getElementById('filterYear').value;

        filteredData = globalAdminData.filter(item => {
            const matchesText = (item.name && item.name.toLowerCase().includes(query)) || 
                                (item.comment && item.comment.toLowerCase().includes(query));
            const matchesEmp = emp === 'all' || item.name === emp;
            
            let matchesMonth = true;
            let matchesYear = true;
            
            if (item.date) {
                const parts = item.date.split('/'); // [DD, MM, YYYY]
                if (month !== 'all') matchesMonth = parts[1] === month;
                if (year !== 'all') matchesYear = parts[2] === year;
            }
            return matchesText && matchesEmp && matchesMonth && matchesYear;
        });

        currentPage = 1;
        calculateTotal();
        renderAdminPage();
    }, 300); // 300ms qotmaslik uchun kutish (Debounce)
}

function calculateTotal() {
    let totalBudget = 0;
    
    // filteredData ichidagi barcha amountUZS larni qo'shib chiqamiz
    // Bu yerda dollarlar allaqachon so'mga aylangan bo'ladi (backend hisobi bo'yicha)
    filteredData.forEach(r => {
        totalBudget += Number(r.amountUZS) || 0;
    });

    // Ekranga chiqarish
    const budgetElement = document.getElementById('totalCompanyUzs');
    if (budgetElement) {
        budgetElement.innerText = totalBudget.toLocaleString() + " UZS";
    }

    // Filtrlangan amallar sonini ham yangilab qo'yamize
    const countElement = document.getElementById('filteredCount');
    if (countElement) {
        countElement.innerText = filteredData.length;
    }
}

// Sahifalarga bo'lib chizish
function renderAdminPage() {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = filteredData.slice(start, end);
    
    let html = '';
    pageData.forEach(r => {
        const isUsd = r.amountUSD > 0;
        const rateText = isUsd && r.rate ? `<span style="font-size:10px; color:#888;">(Kurs: ${r.rate})</span>` : '';
        
        // Rolga qarab TAHRIRLASH va O'CHIRISH tugmalarini chizish
        let actionBtns = '';
        if (myRole === 'Boss' || myRole === 'Admin') {
            actionBtns = `
            <div class="action-btns" style="margin-top:8px;">
                <button class="edit-btn" onclick="openEdit(${r.rowId}, ${r.amountUZS || 0}, ${r.amountUSD || 0}, ${r.rate || 0}, '${r.comment}')">✏️ Tahrirlash</button>
                <button class="del-btn" onclick="deleteRecord(${r.rowId})">🗑 O'chirish</button>
            </div>`;
        }

        html += `<div class="history-item" style="flex-direction: column; align-items: stretch;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:5px;">
                <strong>👤 ${r.name}</strong><span style="font-size:11px; color:#888;">📅 ${r.date}</span>
            </div>
            <div style="margin:8px 0; color:#444;">📝 ${r.comment}</div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight:bold; font-size:15px;">
                    ${r.amountUZS > 0 ? `<div style="color:#2e7d32;">${Number(r.amountUZS).toLocaleString()} UZS</div>` : ''}
                    ${isUsd ? `<div style="color:#e65100;">$${Number(r.amountUSD).toLocaleString()} ${rateText}</div>` : ''}
                </div>
            </div>
            ${actionBtns}
        </div>`;
    });
    document.getElementById('adminList').innerHTML = html;
    renderPaginationControls();
}

function renderPaginationControls() {
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    let html = '';
    if(totalPages > 1) {
        for(let i=1; i<=totalPages; i++) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        }
    }
    document.getElementById('pagination').innerHTML = html;
}

function goToPage(page) { 
    currentPage = page; 
    renderAdminPage(); 
    // Eng tepaga silliq ko'tarilish
    document.getElementById('adminDataArea').scrollIntoView({ behavior: 'smooth' });
}

// ================= 6. EXCEL (.XLSX) YUKLAB OLISH =================
function exportToExcel() {
    try {
        // 1. Kutubxona yuklanganini tekshirish
        if (typeof XLSX === 'undefined') {
            alert("Xatolik: Excel kutubxonasi yuklanmagan! Internet aloqasini tekshiring.");
            return;
        }

        if (filteredData.length === 0) {
            alert("Eksport qilish uchun ma'lumot yo'q!");
            return;
        }

        tg.MainButton.setText("Excel tayyorlanmoqda...").show();

        // 2. Ma'lumotlarni tartiblash
        const exportData = filteredData.map(r => ({
            "Sana": r.date || "",
            "Xodim": r.name || "",
            "Izoh": r.comment || "",
            "Summa (UZS)": Number(r.amountUZS) || 0,
            "Summa (USD)": Number(r.amountUSD) || 0,
            "Kurs": Number(r.rate) || 0
        }));

        // 3. Excel varag'ini yaratish
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        
        // Ustunlar kengligini avtomat sozlash
        worksheet['!cols'] = [
            {wch: 12}, {wch: 20}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 10}
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Hisobot");

        // 4. Faylni yaratish va yuklab olish
        // Telegram brauzerida yuklab olish uchun binary ko'rinishida yozish xavfsizroq
        const wbout = XLSX.write(workbook, {bookType: 'xlsx', type: 'binary'});

        function s2ab(s) {
            const buf = new ArrayBuffer(s.length);
            const view = new Uint8Array(buf);
            for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
        }

        const blob = new Blob([s2ab(wbout)], {type: "application/octet-stream"});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Hisobot_${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        tg.MainButton.hide();
        alert("Excel fayl yuklab olishga yuborildi!");

    } catch (error) {
        console.error("Excel xatosi:", error);
        alert("Excel yaratishda xato: " + error.message);
        tg.MainButton.hide();
    }
}

// ================= 7. TAHRIRLASH VA O'CHIRISH (Modal Logic) =================
function openEdit(rowId, uzs, usd, rate, comment) {
    document.getElementById('editRowId').value = rowId;
    document.getElementById('editAmountUZS').value = uzs;
    document.getElementById('editAmountUSD').value = usd;
    document.getElementById('editRate').value = rate;
    document.getElementById('editComment').value = (comment !== 'undefined' && comment !== 'null') ? comment : '';
    document.getElementById('editModal').classList.remove('hidden');
}

function closeModal() { 
    document.getElementById('editModal').classList.add('hidden'); 
}

async function saveEdit() {
    const rowId = document.getElementById('editRowId').value;
    const amountUZS = document.getElementById('editAmountUZS').value;
    const amountUSD = document.getElementById('editAmountUSD').value;
    const rate = document.getElementById('editRate').value;
    const comment = document.getElementById('editComment').value;
    
    closeModal();
    // Modal oynadan ma'lumotni olgach Backend dagi 'admin_edit' ga yuborish
    document.getElementById('adminList').innerHTML = "<p class='text-center'>Saqlanmoqda... ⏳</p>";
    await fetch(API_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: "admin_edit", telegramId, rowId, amountUZS, amountUSD, rate, comment }) 
    });
    loadAdminData(); // Tahrirlangach bazani yangilab olamiz
}

async function deleteRecord(rowId) {
    if(!confirm("Haqiqatan ham ushbu ma'lumotni o'chirmoqchimisiz?")) return;
    document.getElementById('adminList').innerHTML = "<p class='text-center'>O'chirilmoqda... ⏳</p>";
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "admin_delete", telegramId, rowId }) });
    loadAdminData();
}

// ================= 8. ROLLAR BOSHQARUVI (Faqat Boss uchun) =================
async function loadAdmins() {
    document.getElementById('rolesList').innerHTML = "<p class='text-center'>Yuklanmoqda... ⏳</p>";
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "get_admins", telegramId }) });
        const data = await res.json();
        if (data.success) {
            let html = '';
            data.data.forEach(r => {
                let badgeColor = r.role === 'Boss' ? '#d84315' : (r.role === 'Direktor' ? '#00838f' : '#2a5298');
                html += `<div class="history-item">
                    <div><strong>${r.name}</strong><br><span style="font-size:11px; color:#888;">ID: ${r.tgId}</span></div>
                    <div style="text-align:right;">
                        <span style="background:${badgeColor}; color:#fff; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:bold;">${r.role}</span><br>
                        <button class="del-btn" style="padding:4px 10px; width:auto; margin-top:5px;" onclick="delAdmin(${r.rowId})">🗑</button>
                    </div>
                </div>`;
            });
            document.getElementById('rolesList').innerHTML = html;
        }
    } catch(e) {}
}

async function addAdmin() {
    const st = document.getElementById('adminStatus');
    const newTgId = document.getElementById('newAdminId').value;
    const newName = document.getElementById('newAdminName').value || "Yangi Xodim";
    const newRole = document.getElementById('newAdminRole').value;
    
    if(!newTgId) { st.style.color="red"; st.innerText="ID raqami yozilishi shart!"; return; }
    st.style.color="#888"; st.innerText="Qo'shilmoqda...";

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "add_admin", telegramId, newTgId, newName, newRole }) });
        const data = await res.json();
        if (data.success) {
            st.style.color="green"; st.innerText="✅ Tizimga muvaffaqiyatli qo'shildi!";
            document.getElementById('newAdminId').value = ''; 
            document.getElementById('newAdminName').value = '';
            loadAdmins();
        } else { st.style.color="red"; st.innerText="❌ " + (data.error || "Xato"); }
    } catch(e) {}
}

async function delAdmin(rowId) {
    if(!confirm("Bu rolni tizimdan o'chirishga ishonchingiz komilmi?")) return;
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "del_admin", telegramId, rowId }) });
        const data = await res.json();
        if (data.success) { loadAdmins(); } else { alert(data.error); }
    } catch(e) {}
}
