// ================= TAHRIRLASH VA O'CHIRISH =================

// ASOSIY TUZATISH: rowId bo'yicha globalAdminData dan topadi
// onclick="openEdit(rowId)" - string escape muammosi yo'q
function openEdit(rowId) {
    const r = globalAdminData.find(x => String(x.rowId) === String(rowId));
    if (!r) return;

    document.getElementById('editRowId').value    = r.rowId;
    document.getElementById('editAmountUZS').value = r.amountUZS || '';
    document.getElementById('editAmountUSD').value = r.amountUSD || '';
    document.getElementById('editRate').value      = r.rate || '';
    document.getElementById('editComment').value   = r.comment || '';

    const headerName = document.getElementById('editHeaderName');
    const headerDate = document.getElementById('editHeaderDate');
    if (headerName) headerName.innerText = r.name  || '—';
    if (headerDate) headerDate.innerText = r.date  || '—';

    document.getElementById('editModal').classList.remove('hidden');

    if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

function closeModal() {
    document.getElementById('editModal').classList.add('hidden');
}

async function saveEdit() {
    const rowId     = document.getElementById('editRowId').value;
    const amountUZS = document.getElementById('editAmountUZS').value;
    const amountUSD = document.getElementById('editAmountUSD').value;
    const rate      = document.getElementById('editRate').value;
    const comment   = document.getElementById('editComment').value;

    closeModal();
    document.getElementById('adminList').innerHTML = `
        <div class="skeleton skeleton-item"></div>
        <div class="skeleton skeleton-item"></div>`;

    await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "admin_edit", telegramId, rowId, amountUZS, amountUSD, rate, comment })
    });
    loadAdminData();
}

async function deleteRecord(rowId) {
    if (!confirm("Ushbu ma'lumotni o'chirishga ishonchingiz komilmi?")) return;

    document.getElementById('adminList').innerHTML = `
        <div class="skeleton skeleton-item"></div>
        <div class="skeleton skeleton-item"></div>`;

    await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "admin_delete", telegramId, rowId })
    });
    loadAdminData();
}