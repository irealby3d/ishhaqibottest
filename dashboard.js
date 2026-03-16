// ================= DASHBOARD =================
// Grafik ob'ektlarini saqlaymiz (destroy qilish uchun)
const _charts = {};

function destroyChart(id) {
    if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

// Oy nomlari
const MONTHS_UZ = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];

// Ranglar palitasi
const PALETTE = ['#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316'];

// -------- YORDAMCHI FUNKSIYALAR --------
function parseDate(dateStr) {
    if (!dateStr) return null;
    const p = dateStr.split('/');
    if (p.length < 3) return null;
    return { d: p[0], m: p[1], y: p[2], key: `${p[2]}-${p[1]}`, label: `${MONTHS_UZ[parseInt(p[1])-1]} ${p[2]}` };
}

function getLastNMonths(n) {
    const result = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        result.push({ key: `${y}-${m}`, label: `${MONTHS_UZ[d.getMonth()]} ${y}` });
    }
    return result;
}

function sumByMonthKey(records, months) {
    const map = {};
    months.forEach(mo => { map[mo.key] = 0; });
    records.forEach(r => {
        const dt = parseDate(r.date);
        if (dt && map[dt.key] !== undefined) map[dt.key] += Number(r.amountUZS) || 0;
    });
    return months.map(mo => map[mo.key]);
}

function sumByEmployee(records) {
    const map = {};
    records.forEach(r => {
        if (!r.name) return;
        map[r.name] = (map[r.name] || 0) + (Number(r.amountUZS) || 0);
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
}

function totalUZS(records)   { return records.reduce((s,r)=>s+(Number(r.amountUZS)||0),0); }
function totalUSD(records)   { return records.reduce((s,r)=>s+(Number(r.amountUSD)||0),0); }
function pureUZS(records)    { return records.filter(r=>!Number(r.amountUSD)).reduce((s,r)=>s+(Number(r.amountUZS)||0),0); }
function convertedUZS(records) { return records.filter(r=>Number(r.amountUSD)>0).reduce((s,r)=>s+(Number(r.amountUZS)||0),0); }

function avgMonthly(records) {
    if (!records.length) return 0;
    const keys = new Set(records.map(r=>{ const d=parseDate(r.date); return d?d.key:null; }).filter(Boolean));
    return keys.size ? Math.round(totalUZS(records)/keys.size) : 0;
}

function peakMonth(records) {
    const map = {};
    records.forEach(r=>{
        const d=parseDate(r.date);
        if(d) map[d.label]=(map[d.label]||0)+(Number(r.amountUZS)||0);
    });
    if(!Object.keys(map).length) return '—';
    return Object.entries(map).sort((a,b)=>b[1]-a[1])[0][0];
}

// -------- CHART YARATISH --------
function makeDonut(canvasId, labels, values, colors) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    _charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets:[{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }]
        },
        options: {
            cutout: '72%',
            animation: { animateRotate: true, duration: 900, easing: 'easeOutQuart' },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding:16, font:{ family:"'Plus Jakarta Sans',sans-serif", size:12, weight:'600' },
                              color:'#334155', boxWidth:12, borderRadius:4, useBorderRadius:true }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${Number(ctx.raw).toLocaleString()} UZS`
                    }
                }
            }
        }
    });
}

function makeBar(canvasId, labels, datasets, stacked=false) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    _charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 800, easing: 'easeOutQuart' },
            scales: {
                x: {
                    stacked,
                    grid: { display: false },
                    ticks: { font:{ family:"'Plus Jakarta Sans',sans-serif", size:11 }, color:'#64748B' }
                },
                y: {
                    stacked,
                    grid: { color:'#F1F5F9' },
                    ticks: {
                        font:{ family:"'Plus Jakarta Sans',sans-serif", size:11 }, color:'#64748B',
                        callback: v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v>=1000?(v/1000).toFixed(0)+'K':v
                    }
                }
            },
            plugins: {
                legend: {
                    display: datasets.length > 1,
                    labels: { font:{ family:"'Plus Jakarta Sans',sans-serif", size:11 }, color:'#334155', boxWidth:10, borderRadius:3, useBorderRadius:true }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label||''}: ${Number(ctx.raw).toLocaleString()} UZS`
                    }
                }
            }
        }
    });
}

function makeHBar(canvasId, labels, values, colors) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    _charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets:[{
                data: values, backgroundColor: colors,
                borderRadius: 6, borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 800, easing: 'easeOutQuart' },
            scales: {
                x: {
                    grid:{ color:'#F1F5F9' },
                    ticks:{
                        font:{family:"'Plus Jakarta Sans',sans-serif",size:11}, color:'#64748B',
                        callback: v => v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'K':v
                    }
                },
                y: { grid:{display:false}, ticks:{font:{family:"'Plus Jakarta Sans',sans-serif",size:12,weight:'600'},color:'#0F172A'} }
            },
            plugins: {
                legend: { display:false },
                tooltip: { callbacks: { label: ctx => ` ${Number(ctx.raw).toLocaleString()} UZS` } }
            }
        }
    });
}

function makeLine(canvasId, labels, datasets) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    _charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 900, easing: 'easeOutQuart' },
            scales: {
                x: { grid:{display:false}, ticks:{font:{family:"'Plus Jakarta Sans',sans-serif",size:11},color:'#64748B'} },
                y: {
                    grid:{color:'#F1F5F9'},
                    ticks:{
                        font:{family:"'Plus Jakarta Sans',sans-serif",size:11},color:'#64748B',
                        callback:v=>v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'K':v
                    }
                }
            },
            plugins: {
                legend: {
                    display: datasets.length > 1,
                    labels:{font:{family:"'Plus Jakarta Sans',sans-serif",size:11},color:'#334155',boxWidth:10,borderRadius:3,useBorderRadius:true}
                },
                tooltip: { callbacks:{ label:ctx=>` ${ctx.dataset.label||''}: ${Number(ctx.raw).toLocaleString()} UZS` } }
            }
        }
    });
}

// -------- STAT CARD HTML --------
function statCard(icon, label, value, sub='', accent='') {
    return `
    <div class="dash-stat-card" style="${accent?'border-top:3px solid '+accent:''}">
        <div class="dash-stat-icon">${icon}</div>
        <div class="dash-stat-body">
            <div class="dash-stat-label">${label}</div>
            <div class="dash-stat-value">${value}</div>
            ${sub ? `<div class="dash-stat-sub">${sub}</div>` : ''}
        </div>
    </div>`;
}

function chartCard(title, canvasId, height=220, extra='') {
    return `
    <div class="dash-chart-card">
        <div class="dash-chart-title">${title}</div>
        ${extra}
        <div style="position:relative;height:${height}px;">
            <canvas id="${canvasId}"></canvas>
        </div>
    </div>`;
}

// -------- ASOSIY RENDER --------
function loadDashboard() {
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    if (myRole === 'Boss' || myRole === 'Direktor') {
        renderBossDashboard(container);
    } else if (myRole === 'Admin') {
        renderAdminDashboard(container);
    } else {
        renderUserDashboard(container);
    }
}

// ===== HODIM DASHBOARD =====
function renderUserDashboard(container) {
    const rec   = myFilteredRecords.length ? myFilteredRecords : myFullRecords;
    const total = totalUZS(rec);
    const usd   = totalUSD(rec);
    const avg   = avgMonthly(rec);
    const peak  = peakMonth(rec);
    const months6 = getLastNMonths(6);

    container.innerHTML = `
    <div class="dash-role-badge user">👤 Shaxsiy Statistika</div>

    <div class="dash-stats-grid">
        ${statCard('💰','Jami Xarajat', total.toLocaleString()+' UZS','So\'mda hisoblaganda','#10B981')}
        ${statCard('💵','Dollar Xarajat','$'+usd.toLocaleString(),'Dollarda kiritilgan','#F59E0B')}
        ${statCard('📅','Oylik O\'rtacha', avg>=1000000?(avg/1000000).toFixed(1)+'M UZS':avg>=1000?(avg/1000).toFixed(0)+'K UZS':avg+' UZS','','#3B82F6')}
        ${statCard('🏆','Eng Faol Oy', peak,'Eng ko\'p xarajat','#8B5CF6')}
    </div>

    ${chartCard('📊 Oxirgi 6 Oy Xarajatlar', 'chartUserMonthly', 200)}
    ${chartCard('🥧 Valyuta Taqsimoti', 'chartUserDonut', 240)}
    `;

    // Bar — oylik
    makeBar('chartUserMonthly',
        months6.map(m=>m.label),
        [{
            label:'Xarajat',
            data: sumByMonthKey(rec, months6),
            backgroundColor: months6.map((_,i)=> i===months6.length-1?'#10B981':'#BFDBFE'),
            borderRadius: 8, borderSkipped: false
        }]
    );

    // Donut — valyuta
    const uzsOnly = pureUZS(rec);
    const usdConv = convertedUZS(rec);
    if (uzsOnly > 0 || usdConv > 0) {
        makeDonut('chartUserDonut',
            ["So'm (UZS)", "Dollar (UZS'ga)"],
            [uzsOnly, usdConv],
            ['#10B981', '#F59E0B']
        );
    } else {
        document.getElementById('chartUserDonut').parentElement.innerHTML =
            '<div class="dash-empty">Ma\'lumot yo\'q</div>';
    }
}

// ===== ADMIN DASHBOARD =====
function renderAdminDashboard(container) {
    const myRec   = myFullRecords;
    const allRec  = globalAdminData;

    if (!allRec.length) {
        container.innerHTML = `<div class="dash-empty" style="padding:60px 20px;">
            <div style="font-size:40px;margin-bottom:12px;">📊</div>
            <p>Avval Admin panelni yuklang</p>
        </div>`;
        return;
    }

    const months6   = getLastNMonths(6);
    const byEmp     = sumByEmployee(allRec).slice(0,7);
    const empNames  = byEmp.map(e=>e[0].split(' ')[0]); // Faqat ism
    const empVals   = byEmp.map(e=>e[1]);
    const myTotal   = totalUZS(myRec);
    const allTotal  = totalUZS(allRec);
    const empCount  = new Set(allRec.map(r=>r.name)).size;

    container.innerHTML = `
    <div class="dash-role-badge admin">🛡 Admin Statistikasi</div>

    <div class="dash-section-title">🏢 Kompaniya Umumiy</div>
    <div class="dash-stats-grid">
        ${statCard('💰','Jami Budjet',allTotal>=1000000?(allTotal/1000000).toFixed(2)+'M UZS':allTotal.toLocaleString()+' UZS','','#10B981')}
        ${statCard('👥','Xodimlar',empCount+' nafar','Faol xodimlar','#3B82F6')}
        ${statCard('📋','Amallar soni',allRec.length+' ta','Jami kiritilgan','#8B5CF6')}
        ${statCard('👤','Mening Ulushim',myTotal>0?Math.round(myTotal/allTotal*100)+'%':'0%','Kompaniya budjetidan','#F59E0B')}
    </div>

    ${chartCard('📊 Oylik Xarajat Trendi', 'chartAdminTrend', 210)}
    ${chartCard('🏅 Xodimlar Reytingi', 'chartAdminEmp', Math.max(180, byEmp.length*46))}

    <div class="dash-section-title">👤 Mening Statistikam</div>
    <div class="dash-stats-grid">
        ${statCard('💰','Mening Xarajatim',myTotal.toLocaleString()+' UZS','','#10B981')}
        ${statCard('📅','Oylik O\'rtacha',avgMonthly(myRec)>=1000?(avgMonthly(myRec)/1000).toFixed(0)+'K UZS':avgMonthly(myRec)+' UZS','','#3B82F6')}
    </div>
    ${chartCard('📈 Mening Oylik Xarajatlarim', 'chartAdminMy', 190)}
    `;

    // Trend line — kompaniya
    makeLine('chartAdminTrend',
        months6.map(m=>m.label),
        [{
            label:'Kompaniya',
            data: sumByMonthKey(allRec, months6),
            borderColor:'#3B82F6', backgroundColor:'rgba(59,130,246,0.08)',
            borderWidth:2.5, pointRadius:5, pointBackgroundColor:'#3B82F6',
            fill:true, tension:0.4
        }]
    );

    // Horizontal bar — employees
    makeHBar('chartAdminEmp', empNames, empVals, PALETTE);

    // Bar — my monthly
    makeBar('chartAdminMy',
        months6.map(m=>m.label),
        [{
            label:'Mening xarajatim',
            data: sumByMonthKey(myRec, months6),
            backgroundColor:'#10B981', borderRadius:8, borderSkipped:false
        }]
    );
}

// ===== BOSS / DIREKTOR DASHBOARD =====
function renderBossDashboard(container) {
    const allRec  = globalAdminData;

    if (!allRec.length) {
        container.innerHTML = `<div class="dash-empty" style="padding:60px 20px;">
            <div style="font-size:40px;margin-bottom:12px;">📊</div>
            <p>Avval Admin → Xarajatlar bo'limini oching</p>
        </div>`;
        return;
    }

    const months6   = getLastNMonths(6);
    const months12  = getLastNMonths(12);
    const byEmp     = sumByEmployee(allRec).slice(0,8);
    const empNames  = byEmp.map(e=>e[0].split(' ')[0]);
    const empVals   = byEmp.map(e=>e[1]);
    const allTotal  = totalUZS(allRec);
    const allUSD    = totalUSD(allRec);
    const empCount  = new Set(allRec.map(r=>r.name)).size;
    const txCount   = allRec.length;
    const peak      = peakMonth(allRec);
    const avg       = avgMonthly(allRec);

    // Oylar bo'yicha UZS va USD
    const monthly12UZS = sumByMonthKey(allRec, months12);
    const monthly12USD = allRec.reduce((acc,r)=>{
        const d = parseDate(r.date);
        if (!d) return acc;
        const idx = months12.findIndex(m=>m.key===d.key);
        if (idx>=0) acc[idx]+=(Number(r.amountUSD)||0)*12000; // approximate display
        return acc;
    }, Array(12).fill(0));

    container.innerHTML = `
    <div class="dash-role-badge boss">${myRole==='Boss'?'👑 Boss':'🎯 Direktor'} — Umumiy Statistika</div>

    <div class="dash-stats-grid">
        ${statCard('💰','Jami Budjet', allTotal>=1000000?(allTotal/1000000).toFixed(2)+'M':allTotal.toLocaleString()+' UZS','','#10B981')}
        ${statCard('💵','Dollar Xarajat','$'+allUSD.toLocaleString(),'USD formatida','#F59E0B')}
        ${statCard('👥','Xodimlar',empCount+' nafar','Faol xodimlar','#3B82F6')}
        ${statCard('📋','Amallar',txCount+' ta','Jami kiritilgan','#8B5CF6')}
        ${statCard('📅','Oylik O\'rtacha',avg>=1000000?(avg/1000000).toFixed(1)+'M UZS':avg>=1000?(avg/1000).toFixed(0)+'K UZS':avg+' UZS','','#EC4899')}
        ${statCard('🏆','Eng Faol Oy',peak,'Eng ko\'p xarajat','#14B8A6')}
    </div>

    ${chartCard('📈 12 Oylik Xarajat Trendi', 'chartBossTrend', 220)}
    ${chartCard('🥧 Valyuta Taqsimoti', 'chartBossDonut', 250)}
    ${chartCard('🏅 Top Xodimlar Reytingi', 'chartBossEmp', Math.max(200, byEmp.length*50))}
    ${chartCard('📊 Oxirgi 6 Oy (Taqqoslash)', 'chartBossBar6', 220)}
    `;

    // 12-oy trend
    makeLine('chartBossTrend',
        months12.map(m=>m.label),
        [{
            label:'Jami Budjet (UZS)',
            data: monthly12UZS,
            borderColor:'#10B981', backgroundColor:'rgba(16,185,129,0.07)',
            borderWidth:2.5, pointRadius:4, pointBackgroundColor:'#10B981',
            fill:true, tension:0.4
        }]
    );

    // Donut — valyuta
    const uzsOnly = pureUZS(allRec);
    const usdConv = convertedUZS(allRec);
    makeDonut('chartBossDonut',
        ["Faqat So'm","Dollar (so'mga)"],
        [uzsOnly, usdConv],
        ['#10B981','#F59E0B']
    );

    // Horizontal bar — top employees
    makeHBar('chartBossEmp', empNames, empVals,
        empVals.map((_,i)=>PALETTE[i % PALETTE.length])
    );

    // 6-oy bar (stacked look — 2 dataset: UZS only + converted USD)
    const m6UZSonly = months6.map(mo=>{
        return allRec.filter(r=>{ const d=parseDate(r.date); return d&&d.key===mo.key&&!Number(r.amountUSD); })
                     .reduce((s,r)=>s+(Number(r.amountUZS)||0),0);
    });
    const m6USDconv = months6.map(mo=>{
        return allRec.filter(r=>{ const d=parseDate(r.date); return d&&d.key===mo.key&&Number(r.amountUSD)>0; })
                     .reduce((s,r)=>s+(Number(r.amountUZS)||0),0);
    });

    makeBar('chartBossBar6',
        months6.map(m=>m.label),
        [
            { label:"So'm",   data:m6UZSonly, backgroundColor:'#10B981', borderRadius:6, borderSkipped:false },
            { label:"Dollar", data:m6USDconv, backgroundColor:'#F59E0B', borderRadius:6, borderSkipped:false }
        ],
        true // stacked
    );
}