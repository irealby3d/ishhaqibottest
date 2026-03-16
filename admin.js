// ================= 4. ADMIN FUNKSIYALARI (TUZATILGAN) =================

async function loadAdminData() {
    document.getElementById('adminList').innerHTML = `
        <div class="skeleton skeleton-item"></div>
        <div class="skeleton skeleton-item"></div>
        <div class="skeleton skeleton-item"></div>`;

    try {
        const res  = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "admin_get_all", telegramId })
        });
        const data = await res.json();

        if (data.success) {
            globalAdminData = data.data;
            filteredData    = [...globalAdminData];
            currentPage     = 1;
            populateFilters();
            calculateTotal();
            renderAdminPage();
        } else {
            showAdminError("Server xatosi: " + (data.error || "noma'lum xato"));
        }
    } catch (e) {
        console.error("Admin yuklanmadi:", e);
        showAdminError("Internet ulanishini tekshiring va qayta urining.");
    }
}

function showAdminError(msg) {
    document.getElementById('adminList').innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <p style="color:#EF4444;font-weight:700;">Yuklanmadi</p>
            <p style="font-size:12px;margin-top:6px;color:var(--text-muted);">${msg}</p>
            <button class="btn-main bg-navy" style="margin-top:16px;width:auto;padding:10px 24px;" onclick="loadAdminData()">
                🔄 Qayta urinish
            </button>
        </div>`;
}

function populateFilters() {
    const empSelect  = document.getElementById('filterEmployee');
    const yearSelect = document.getElementById('filterYear');
    let employees = new Set();
    let years     = new Set();

    globalAdminData.forEach(r => {
        if (r.name) employees.add(r.name);
        if (r.date) {
            const parts = r.date.split('/');
            if (parts[2]) years.add(parts[2]);
        }
    });

    empSelect.innerHTML  = '<option value="all">Barcha xodimlar</option>';
    yearSelect.innerHTML = '<option value="all">Yillar</option>';

    Array.from(employees).sort().forEach(emp =>
        empSelect.innerHTML += `<option value="${emp}">${emp}</option>`
    );
    Array.from(years).sort((a, b) => b - a).forEach(y =>
        yearSelect.innerHTML += `<option value="${y}">${y}</option>`
    );
}

let debounceTimer;
function applyFilters() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const query = (document.getElementById('searchInput').value || '').toLowerCase();
        const emp   = document.getElementById('filterEmployee').value;
        const month = document.getElementById('filterMonth').value;
        const year  = document.getElementById('filterYear').value;

        filteredData = globalAdminData.filter(item => {
            const matchesText = (item.name    && item.name.toLowerCase().includes(query)) ||
                                (item.comment && item.comment.toLowerCase().includes(query));
            const matchesEmp  = emp === 'all' || item.name === emp;
            let matchesMonth  = true;
            let matchesYear   = true;

            if (item.date) {
                const parts = item.date.split('/');
                if (month !== 'all') matchesMonth = parts[1] === month;
                if (year  !== 'all') matchesYear  = parts[2] === year;
            }
            return matchesText && matchesEmp && matchesMonth && matchesYear;
        });

        currentPage = 1;
        calculateTotal();
        renderAdminPage();
    }, 300);
}

function calculateTotal() {
    let total = 0;
    filteredData.forEach(r => { total += Number(r.amountUZS) || 0; });

    const budgetEl = document.getElementById('totalCompanyUzs');
    const countEl  = document.getElementById('filteredCount');
    if (budgetEl) budgetEl.innerText = total.toLocaleString() + " UZS";
    if (countEl)  countEl.innerText  = filteredData.length;
}

function renderAdminPage() {
    if (filteredData.length === 0) {
        document.getElementById('adminList').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <p>Ma'lumot topilmadi</p>
            </div>`;
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    const start    = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageData = filteredData.slice(start, start + ITEMS_PER_PAGE);

    let html = '';
    pageData.forEach(r => {
        // ASOSIY TUZATISH: onclick ga faqat rowId beriladi, string escape muammosi yo'q
        const isUsd = Number(r.amountUSD) > 0;

        const amountChips = `
            ${Number(r.amountUZS) > 0
                ? `<span class="amount-chip uzs">💰 ${Number(r.amountUZS).toLocaleString()} UZS</span>`
                : ''}
            ${isUsd
                ? `<span class="amount-chip usd">💵 $${Number(r.amountUSD).toLocaleString()}</span>`
                : ''}
            ${isUsd && r.rate
                ? `<span class="rate-tag">Kurs: ${Number(r.rate).toLocaleString()}</span>`
                : ''}`;

        let actionBtns = '';
        if (myRole === 'Boss' || myRole === 'Admin') {
            actionBtns = `
            <div class="action-btns">
                <button class="edit-btn" onclick="openEdit(${r.rowId})">✏️ Tahrirlash</button>
                <button class="del-btn"  onclick="deleteRecord(${r.rowId})">🗑 O'chirish</button>
            </div>`;
        }

        html += `
        <div class="history-item">
            <div class="item-header">
                <span class="item-name">👤 ${r.name || '—'}</span>
                <span class="item-date">${r.date || '—'}</span>
            </div>
            <div class="item-comment">📝 ${r.comment || '—'}</div>
            <div class="item-amounts">${amountChips}</div>
            ${actionBtns}
        </div>`;
    });

    document.getElementById('adminList').innerHTML = html;
    renderPaginationControls();
}

function renderPaginationControls() {
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginEl    = document.getElementById('pagination');
    if (!paginEl) return;

    let html = '';
    if (totalPages > 1) {
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        }
    }
    paginEl.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderAdminPage();
    const area = document.getElementById('adminDataArea');
    if (area) area.scrollIntoView({ behavior: 'smooth' });
}