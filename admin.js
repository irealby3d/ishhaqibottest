// ================= ADMIN FUNKSIYALARI =================

const ADMIN_SERVER_PAGE_SIZE = 20;
let adminTotalCount = 0;
let adminTotalPages = 1;
let adminTotalUZS = 0;
let adminFiltersReady = false;
let adminReqSerial = 0;
let adminFilterDebounceTimer;

function getAdminFilterState() {
    return {
        query: (document.getElementById('searchInput')?.value || '').trim(),
        employee: document.getElementById('filterEmployee')?.value || 'all',
        month: document.getElementById('filterMonth')?.value || 'all',
        year: document.getElementById('filterYear')?.value || 'all'
    };
}

function normalizeAdminFilterState(state) {
    const s = state || {};
    return {
        query: String(s.query || ''),
        employee: String(s.employee || 'all'),
        month: String(s.month || 'all'),
        year: String(s.year || 'all')
    };
}

function setSelectValueSafe(selectEl, value) {
    if (!selectEl) return;
    const v = String(value || 'all');
    const found = Array.from(selectEl.options).some(function (opt) { return opt.value === v; });
    selectEl.value = found ? v : 'all';
}

function populateFiltersFromServer(employees, years, selectedState) {
    const state = normalizeAdminFilterState(selectedState);
    const empSel = document.getElementById('filterEmployee');
    const yearSel = document.getElementById('filterYear');

    if (empSel) {
        empSel.innerHTML = '<option value="all">Barcha xodimlar</option>';
        (employees || []).forEach(function (name) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            empSel.appendChild(option);
        });
        setSelectValueSafe(empSel, state.employee);
    }

    if (yearSel) {
        yearSel.innerHTML = '<option value="all">Yillar</option>';
        (years || []).forEach(function (year) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSel.appendChild(option);
        });
        setSelectValueSafe(yearSel, state.year);
    }

    adminFiltersReady = true;
}

async function loadAdminData() {
    document.getElementById('adminList').innerHTML = `
        <div class="skeleton skeleton-item"></div>
        <div class="skeleton skeleton-item"></div>
        <div class="skeleton skeleton-item"></div>`;

    adminFiltersReady = false;
    await fetchAdminPage(1, { refreshMeta: true });
}

async function fetchAdminPage(page, opts) {
    const options = opts || {};
    const requestId = ++adminReqSerial;
    const state = normalizeAdminFilterState(getAdminFilterState());

    try {
        const data = await apiRequest({
            action: 'admin_get_all',
            page: Number(page) || 1,
            pageSize: ADMIN_SERVER_PAGE_SIZE,
            query: state.query,
            employee: state.employee,
            month: state.month,
            year: state.year
        });

        if (requestId !== adminReqSerial) return;

        if (!data.success) {
            showAdminError(data.error || 'Server xatosi');
            return;
        }

        filteredData = data.data || [];
        globalAdminData = filteredData;
        globalAdminDataIsPartial = true;
        currentPage = Number(data.page) || 1;
        adminTotalPages = Math.max(1, Number(data.totalPages) || 1);
        adminTotalCount = Number(data.totalCount) || filteredData.length;
        adminTotalUZS = Number(data.totalUZS) || 0;

        if (!adminFiltersReady || options.refreshMeta) {
            populateFiltersFromServer(data.employees || [], data.years || [], state);
        }

        calculateTotal();
        renderAdminPage();
    } catch (e) {
        console.error(e);
        if (requestId !== adminReqSerial) return;
        showAdminError('Internet ulanishini tekshiring.');
    }
}

function showAdminError(msg) {
    const safeMsg = escapeHtml(msg || 'Server xatosi');
    document.getElementById('adminList').innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <p style="color:#EF4444;font-weight:700;">Yuklanmadi</p>
            <p style="font-size:12px;margin-top:6px;color:var(--text-muted);">${safeMsg}</p>
            <button class="btn-main bg-navy" style="margin-top:16px;width:auto;padding:10px 24px;" onclick="loadAdminData()">🔄 Qayta urinish</button>
        </div>`;
    document.getElementById('pagination').innerHTML = '';
}

function applyFilters() {
    clearTimeout(adminFilterDebounceTimer);
    adminFilterDebounceTimer = setTimeout(function () {
        fetchAdminPage(1);
    }, 300);
}

function calculateTotal() {
    const bEl = document.getElementById('totalCompanyUzs');
    const cEl = document.getElementById('filteredCount');
    if (bEl) bEl.innerText = adminTotalUZS.toLocaleString() + ' UZS';
    if (cEl) cEl.innerText = adminTotalCount;
}

function renderAdminPage() {
    if (!filteredData.length) {
        document.getElementById('adminList').innerHTML =
            `<div class="empty-state"><div class="empty-icon">🔍</div><p>Ma'lumot topilmadi</p></div>`;
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    const canEditAny = myRole === 'SuperAdmin' ||
                       (myRole === 'Admin' && (myPermissions.canEdit || myPermissions.canDelete));

    let html = '';
    filteredData.forEach(function (r, idx) {
        const isUsd = Number(r.amountUSD) > 0;
        const rate = Number(r.rate) || Number(r.exchangeRate) || 0;
        const effRate = rate > 0 ? rate : (isUsd && r.amountUZS > 0 ? Math.round(r.amountUZS / r.amountUSD) : 0);
        const safeName = escapeHtml(r.name || '—');
        const safeDate = escapeHtml(r.date || '—');
        const safeComment = escapeHtml(r.comment || '—');

        html += `
        <div class="history-item" onclick="showAdminDetailModal(${idx})" style="cursor:pointer;">
            <div class="item-header">
                <span class="item-name">👤 ${safeName}</span>
                <span class="item-date">${safeDate}</span>
            </div>
            <div class="item-comment">📝 ${safeComment}</div>
            <div class="item-amounts">
                ${Number(r.amountUZS) > 0 ? `<span class="amount-chip uzs">💰 ${Number(r.amountUZS).toLocaleString()} UZS</span>` : ''}
                ${isUsd ? `<span class="amount-chip usd">💵 $${Number(r.amountUSD).toLocaleString()}</span>` : ''}
                ${isUsd && effRate > 0 ? `<span class="rate-tag">📈 ${effRate.toLocaleString()}</span>` : ''}
            </div>
            ${canEditAny ? `<div class="item-edit-hint">→ batafsil</div>` : ''}
        </div>`;
    });

    document.getElementById('adminList').innerHTML = html;
    renderPaginationControls();
}

function renderPaginationControls() {
    if (adminTotalPages <= 1) {
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(adminTotalPages, currentPage + 2);
    let html = '';

    if (start > 1) {
        html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
        if (start > 2) html += `<span class="page-ellipsis">…</span>`;
    }

    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    if (end < adminTotalPages) {
        if (end < adminTotalPages - 1) html += `<span class="page-ellipsis">…</span>`;
        html += `<button class="page-btn" onclick="goToPage(${adminTotalPages})">${adminTotalPages}</button>`;
    }

    document.getElementById('pagination').innerHTML = html;
}

function goToPage(page) {
    fetchAdminPage(page);
    document.getElementById('adminDataArea').scrollIntoView({ behavior: 'smooth' });
}

function showAdminDetailModal(idx) {
    const r = filteredData[idx];
    if (!r) return;
    const canEdit = myRole === 'SuperAdmin' ||
                    (myRole === 'Admin' && (myPermissions.canEdit || myPermissions.canDelete));
    showDetailModal(r, canEdit);
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

async function fetchAdminFilteredDataForExport() {
    const state = normalizeAdminFilterState(getAdminFilterState());
    const data = await apiRequest({
        action: 'admin_get_all',
        query: state.query,
        employee: state.employee,
        month: state.month,
        year: state.year
    }, { timeoutMs: 30000 });

    if (!data.success) {
        throw new Error(data.error || 'Eksport uchun ma\'lumot olinmadi');
    }
    return data.data || [];
}
