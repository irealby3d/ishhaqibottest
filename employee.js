// ================= 3. XODIM FUNKSIYALARI =================
let myCurrentPage = 1;
const MY_ITEMS_PER_PAGE = 8;

function initMyFilters() {
    const yearSelect = document.getElementById('myFilterYear');
    let years = new Set();
    myFullRecords.forEach(r => { if (r.date) years.add(r.date.split('/')[2]); });
    yearSelect.innerHTML = '<option value="all">Yillar</option>';
    Array.from(years).sort((a,b)=>b-a).forEach(y =>
        yearSelect.innerHTML += `<option value="${y}">${y}</option>`
    );
    applyMyFilters();
}

function applyMyFilters() {
    const month = document.getElementById('myFilterMonth').value;
    const year  = document.getElementById('myFilterYear').value;
    myFilteredRecords = myFullRecords.filter(r => {
        let m=true, y=true;
        if(r.date){ const p=r.date.split('/');
            if(month!=='all') m=p[1]===month;
            if(year!=='all')  y=p[2]===year;
        }
        return m&&y;
    });
    myCurrentPage = 1;
    drawMyHistoryUI();
}

function drawMyHistoryUI() {
    let tUZS=0, tUSD=0, tTotal=0;
    myFilteredRecords.forEach(r=>{
        const uzs=Number(r.amountUZS)||0, usd=Number(r.amountUSD)||0;
        tTotal+=uzs;
        if(usd>0) tUSD+=usd; else tUZS+=uzs;
    });

    const uzsEl=document.getElementById('myUzs');
    const usdEl=document.getElementById('myUsd');
    const totEl=document.getElementById('myTotalBudget');
    if(uzsEl) uzsEl.innerText = tUZS.toLocaleString();
    if(usdEl) usdEl.innerText = '$'+tUSD.toLocaleString();
    if(totEl) totEl.innerText = tTotal.toLocaleString()+' UZS';

    renderMyPage();
}

function renderMyPage() {
    const total = myFilteredRecords.length;
    const totalPages = Math.ceil(total / MY_ITEMS_PER_PAGE);
    const start = (myCurrentPage-1)*MY_ITEMS_PER_PAGE;
    const pageData = [...myFilteredRecords].reverse().slice(start, start+MY_ITEMS_PER_PAGE);

    let html='';
    pageData.forEach((r,idx)=>{
        const uzs  = Number(r.amountUZS)||0;
        const usd  = Number(r.amountUSD)||0;
        const rate = Number(r.rate)||0;
        // Global index for detail modal
        const globalIdx = myFilteredRecords.length-1-start-idx;

        html += `
        <div class="history-item" onclick="showMyDetailModal(${globalIdx})" style="cursor:pointer;">
            <div class="item-header">
                <span class="item-name">📝 ${r.comment||'—'}</span>
                <span class="item-date">${r.date||'—'}</span>
            </div>
            <div class="item-amounts">
                ${uzs>0?`<span class="amount-chip uzs">💰 ${uzs.toLocaleString()} UZS</span>`:''}
                ${usd>0?`<span class="amount-chip usd">💵 $${usd.toLocaleString()}</span>`:''}
                ${usd>0&&rate>0?`<span class="rate-tag">📈 ${rate.toLocaleString()}</span>`:''}
            </div>
        </div>`;
    });

    // Pagination
    let pagHtml='';
    if(totalPages>1){
        pagHtml=`<div class="pagination">`;
        for(let i=1;i<=totalPages;i++){
            pagHtml+=`<button class="page-btn ${i===myCurrentPage?'active':''}" onclick="goToMyPage(${i})">${i}</button>`;
        }
        pagHtml+=`</div>`;
    }

    document.getElementById('myHistory').innerHTML =
        html
        ? html+pagHtml
        : `<div class="empty-state"><div class="empty-icon">💸</div><p>Hali hech qanday xarajat yo'q</p></div>`;
}

function goToMyPage(page){
    myCurrentPage=page;
    renderMyPage();
    document.getElementById('myHistory').scrollIntoView({behavior:'smooth',block:'start'});
}

// ---- Shaxsiy batafsil modal ----
function showMyDetailModal(idx){
    const r = myFilteredRecords[idx];
    if(!r) return;
    showDetailModal(r, false); // false = no edit/delete
    if(tg&&tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

// ================= YANGI XARAJAT =================
document.getElementById('financeForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn=document.getElementById('submitBtn');
    const status=document.getElementById('status');
    const amount  =parseFloat(document.getElementById('amount').value);
    const currency=document.getElementById('currency').value;
    const rate    =parseFloat(document.getElementById('rate').value)||0;
    const comment =document.getElementById('comment').value||"Izoh yo'q";
    const amountUZS=currency==='USD'?amount*rate:amount;
    const amountUSD=currency==='USD'?amount:0;
    if(currency==='USD'&&rate<5000) return alert("Iltimos, to'g'ri kursni kiriting!");
    const date=new Intl.DateTimeFormat('uz-UZ',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());
    btn.disabled=true; btn.innerText='⏳ Yuborilmoqda...';
    try{
        await fetch(API_URL,{method:'POST',body:JSON.stringify({action:'add',employeeName,telegramId,amountUZS,amountUSD,rate,comment,date})});
        status.style.color='var(--green-dark)'; status.innerText='✅ Tizimga muvaffaqiyatli saqlandi!';
        setTimeout(()=>window.location.reload(),1200);
    }catch{
        status.style.color='var(--red)'; status.innerText='❌ Xato yuz berdi.';
        btn.disabled=false; btn.innerText='💾 Saqlash';
    }
});