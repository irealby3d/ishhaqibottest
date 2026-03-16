// ================= 3. XODIM FUNKSIYALARI =================

function initMyFilters() {
    const yearSelect = document.getElementById('myFilterYear');
    let years = new Set();
    myFullRecords.forEach(r => { if (r.date) years.add(r.date.split('/')[2]); });

    yearSelect.innerHTML = '<option value="all">Yillar</option>';
    Array.from(years).sort((a, b) => b - a).forEach(y =>
        yearSelect.innerHTML += `<option value="${y}">${y}</option>`
    );
    applyMyFilters();
}

function applyMyFilters() {
    const month = document.getElementById('myFilterMonth').value;
    const year  = document.getElementById('myFilterYear').value;

    myFilteredRecords = myFullRecords.filter(r => {
        let m = true, y = true;
        if (r.date) {
            const p = r.date.split('/');
            if (month !== 'all') m = p[1] === month;
            if (year  !== 'all') y = p[2] === year;
        }
        return m && y;
    });
    drawMyHistoryUI();
}

function drawMyHistoryUI() {
    let tUZS = 0, tUSD = 0, tTotalBudget = 0, html = '';

    [...myFilteredRecords].reverse().forEach(r => {
        const uzs = Number(r.amountUZS) || 0;
        const usd = Number(r.amountUSD) || 0;

        // amountUZS backend tomonidan (USD * Rate) sifatida saqlanadi
        tTotalBudget += uzs;
        if (usd > 0) tUSD += usd;
        else         tUZS += uzs;

        html += `
        <div class="history-item" style="flex-direction:column;align-items:stretch;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-weight:600;">${r.comment}</span>
                <span style="font-size:11px;color:#888;">📅 ${r.date}</span>
            </div>
            <div style="text-align:right;">
                ${uzs > 0 ? `<div style="color:#2e7d32;font-weight:bold;">${uzs.toLocaleString()} UZS</div>` : ''}
                ${usd > 0 ? `<div style="color:#e65100;font-weight:bold;">$${usd.toLocaleString()}</div>`    : ''}
            </div>
        </div>`;
    });

    // FIX: myUzs va myUsd ham yangilanadi (avval yo'q edi)
    const uzsEl    = document.getElementById('myUzs');
    const usdEl    = document.getElementById('myUsd');
    const budgetEl = document.getElementById('myTotalBudget');

    if (uzsEl)    uzsEl.innerText    = tUZS.toLocaleString();
    if (usdEl)    usdEl.innerText    = '$' + tUSD.toLocaleString();
    if (budgetEl) budgetEl.innerText = tTotalBudget.toLocaleString() + " UZS";

    document.getElementById('myHistory').innerHTML =
        html || "<p class='text-center' style='color:#888;'>Hali hech qanday xarajat yo'q</p>";
}

// ================= YANGI XARAJAT QO'SHISH =================
document.getElementById('financeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn    = document.getElementById('submitBtn');
    const status = document.getElementById('status');

    let amount   = parseFloat(document.getElementById('amount').value);
    let currency = document.getElementById('currency').value;
    let rate     = parseFloat(document.getElementById('rate').value) || 0;
    let comment  = document.getElementById('comment').value || "Izoh yo'q";

    let amountUZS = currency === 'USD' ? amount * rate : amount;
    let amountUSD = currency === 'USD' ? amount : 0;

    if (currency === 'USD' && rate < 5000) {
        return alert("Iltimos, to'g'ri kursni kiriting!");
    }

    const date = new Intl.DateTimeFormat('uz-UZ', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(new Date());

    btn.disabled = true;
    btn.innerText = "Yuborilmoqda...";

    try {
        await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "add", employeeName, telegramId,
                amountUZS, amountUSD, rate, comment, date
            })
        });
        if (status) { status.style.color = "green"; status.innerText = "✅ Tizimga saqlandi!"; }
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
        if (status) { status.style.color = "red"; status.innerText = "❌ Xato yuz berdi"; }
        btn.disabled = false;
        btn.innerText = "Saqlash";
    }
});