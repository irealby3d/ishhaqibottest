// ================= BATAFSIL MA'LUMOT MODALI =================
// showDetailModal(record, canEdit)
// record: { rowId, name, date, comment, amountUZS, amountUSD, rate }
// canEdit: bool — tahrirlash/o'chirish tugmalari ko'rinishi

function showDetailModal(r, canEdit){
    const uzs  = Number(r.amountUZS)||0;
    const usd  = Number(r.amountUSD)||0;
    const rate = Number(r.rate)||0;
    const isUsd= usd>0;

    // Currency type label
    const currencyLabel = isUsd
        ? `<span class="detail-badge usd">💵 Dollar</span>`
        : `<span class="detail-badge uzs">💰 So'm</span>`;

    // Amounts block
    let amountBlock = '';
    if(isUsd){
        amountBlock=`
        <div class="detail-row">
            <span class="detail-key">Summa (USD)</span>
            <span class="detail-val usd-val">$${usd.toLocaleString()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-key">Valyuta kursi</span>
            <span class="detail-val">1$ = ${rate.toLocaleString()} UZS</span>
        </div>
        <div class="detail-row">
            <span class="detail-key">So'mga aylantirish</span>
            <span class="detail-val uzs-val">${uzs.toLocaleString()} UZS</span>
        </div>`;
    } else {
        amountBlock=`
        <div class="detail-row">
            <span class="detail-key">Summa (UZS)</span>
            <span class="detail-val uzs-val">${uzs.toLocaleString()} UZS</span>
        </div>`;
    }

    const nameRow = r.name
        ? `<div class="detail-row"><span class="detail-key">Xodim</span><span class="detail-val"><strong>${r.name}</strong></span></div>`
        : '';

    const editBtns = canEdit ? `
        <div style="display:flex;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">
            <button class="edit-btn" style="flex:1;padding:12px;border-radius:10px;font-size:14px;"
                    onclick="closeDetailModal();openEdit(${r.rowId})">✏️ Tahrirlash</button>
            <button class="del-btn"  style="flex:1;padding:12px;border-radius:10px;font-size:14px;"
                    onclick="closeDetailModal();deleteRecord(${r.rowId})">🗑 O'chirish</button>
        </div>` : '';

    document.getElementById('detailModalBody').innerHTML=`
        <div class="modal-drag"></div>

        <div class="detail-header">
            ${currencyLabel}
            <div class="detail-comment">${r.comment||'—'}</div>
            <div class="detail-date">📅 ${r.date||'—'}</div>
        </div>

        <div class="detail-card">
            ${nameRow}
            ${amountBlock}
        </div>

        <button class="btn-secondary" style="margin-top:12px;" onclick="closeDetailModal()">✕ Yopish</button>
        ${editBtns}
    `;

    document.getElementById('detailModal').classList.remove('hidden');
}

function closeDetailModal(){
    document.getElementById('detailModal').classList.add('hidden');
}