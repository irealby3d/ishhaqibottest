// ================= DASHBOARD =================
const _charts={};
function destroyChart(id){ if(_charts[id]){_charts[id].destroy();delete _charts[id];} }

const MONTHS_UZ=['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];
const PALETTE=['#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316'];

function parseDate(s){ if(!s)return null; const p=s.split('/'); if(p.length<3)return null; return{m:p[1],y:p[2],key:`${p[2]}-${p[1]}`,label:`${MONTHS_UZ[parseInt(p[1])-1]} ${p[2]}`}; }

function getLastNMonths(n){
    const r=[];
    const now=new Date();
    for(let i=n-1;i>=0;i--){
        const d=new Date(now.getFullYear(),now.getMonth()-i,1);
        const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0');
        r.push({key:`${y}-${m}`,label:`${MONTHS_UZ[d.getMonth()]} ${y}`});
    }
    return r;
}

function sumByMonthKey(recs,months){
    const map={};
    months.forEach(mo=>{map[mo.key]=0;});
    recs.forEach(r=>{ const d=parseDate(r.date); if(d&&map[d.key]!==undefined) map[d.key]+=Number(r.amountUZS)||0; });
    return months.map(mo=>map[mo.key]);
}

function sumByEmployee(recs){
    const map={};
    recs.forEach(r=>{ if(!r.name)return; map[r.name]=(map[r.name]||0)+(Number(r.amountUZS)||0); });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
}

function sumByComment(recs){
    const map={};
    recs.forEach(r=>{ const k=(r.comment||'Izohsiz').slice(0,20); map[k]=(map[k]||0)+(Number(r.amountUZS)||0); });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6);
}

const totalUZS  =r=>r.reduce((s,x)=>s+(Number(x.amountUZS)||0),0);
const totalUSD  =r=>r.reduce((s,x)=>s+(Number(x.amountUSD)||0),0);
const pureUZS   =r=>r.filter(x=>!Number(x.amountUSD)).reduce((s,x)=>s+(Number(x.amountUZS)||0),0);
const convUZS   =r=>r.filter(x=>Number(x.amountUSD)>0).reduce((s,x)=>s+(Number(x.amountUZS)||0),0);

function avgMonthly(recs){
    if(!recs.length)return 0;
    const keys=new Set(recs.map(r=>{const d=parseDate(r.date);return d?d.key:null;}).filter(Boolean));
    return keys.size?Math.round(totalUZS(recs)/keys.size):0;
}

function peakMonth(recs){
    const map={};
    recs.forEach(r=>{const d=parseDate(r.date);if(d)map[d.label]=(map[d.label]||0)+(Number(r.amountUZS)||0);});
    if(!Object.keys(map).length)return'—';
    return Object.entries(map).sort((a,b)=>b[1]-a[1])[0][0];
}

function fmtUZS(v){ return v>=1000000?(v/1000000).toFixed(2)+'M':v>=1000?(v/1000).toFixed(0)+'K':v.toLocaleString(); }

// ---- Chart helpers ----
const BASE_FONT={family:"'Plus Jakarta Sans',sans-serif"};
const TICK_OPTS={font:{...BASE_FONT,size:11},color:'#64748B'};
const TOOLTIP_UZS={callbacks:{label:c=>` ${c.dataset.label||''}: ${Number(c.raw).toLocaleString()} UZS`}};

function makeDonut(id,labels,vals,colors){
    destroyChart(id);
    const ctx=document.getElementById(id); if(!ctx)return;
    _charts[id]=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data:vals,backgroundColor:colors,borderWidth:0,hoverOffset:8}]},
    options:{cutout:'70%',animation:{duration:900,easing:'easeOutQuart'},
    plugins:{legend:{position:'bottom',labels:{padding:14,font:{...BASE_FONT,size:11,weight:'600'},color:'#334155',boxWidth:10,borderRadius:3,useBorderRadius:true}},
    tooltip:{callbacks:{label:c=>` ${c.label}: ${Number(c.raw).toLocaleString()} UZS`}}}}});
}

function makeBar(id,labels,datasets,stacked=false){
    destroyChart(id);
    const ctx=document.getElementById(id); if(!ctx)return;
    _charts[id]=new Chart(ctx,{type:'bar',data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,
    animation:{duration:800,easing:'easeOutQuart'},
    scales:{x:{stacked,grid:{display:false},ticks:TICK_OPTS},
            y:{stacked,grid:{color:'#F1F5F9'},ticks:{...TICK_OPTS,callback:v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'K':v}}},
    plugins:{legend:{display:datasets.length>1,labels:{font:{...BASE_FONT,size:11},color:'#334155',boxWidth:10,borderRadius:3,useBorderRadius:true}},
    tooltip:TOOLTIP_UZS}}});
}

function makeHBar(id,labels,vals,colors){
    destroyChart(id);
    const ctx=document.getElementById(id); if(!ctx)return;
    _charts[id]=new Chart(ctx,{type:'bar',data:{labels,datasets:[{data:vals,backgroundColor:colors,borderRadius:6,borderSkipped:false}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,animation:{duration:800,easing:'easeOutQuart'},
    scales:{x:{grid:{color:'#F1F5F9'},ticks:{...TICK_OPTS,callback:v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'K':v}},
            y:{grid:{display:false},ticks:{font:{...BASE_FONT,size:12,weight:'600'},color:'#0F172A'}}},
    plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${Number(c.raw).toLocaleString()} UZS`}}}}});
}

function makeLine(id,labels,datasets){
    destroyChart(id);
    const ctx=document.getElementById(id); if(!ctx)return;
    _charts[id]=new Chart(ctx,{type:'line',data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,
    animation:{duration:900,easing:'easeOutQuart'},
    scales:{x:{grid:{display:false},ticks:TICK_OPTS},
            y:{grid:{color:'#F1F5F9'},ticks:{...TICK_OPTS,callback:v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'K':v}}},
    plugins:{legend:{display:datasets.length>1,labels:{font:{...BASE_FONT,size:11},color:'#334155',boxWidth:10,borderRadius:3,useBorderRadius:true}},
    tooltip:TOOLTIP_UZS}}});
}

// ---- Layout helpers ----
function statCard(icon,label,value,sub='',accent=''){
    return`<div class="dash-stat-card" style="${accent?'border-top:3px solid '+accent:''}">
        <div class="dash-stat-icon">${icon}</div>
        <div class="dash-stat-body">
            <div class="dash-stat-label">${label}</div>
            <div class="dash-stat-value">${value}</div>
            ${sub?`<div class="dash-stat-sub">${sub}</div>`:''}
        </div></div>`;
}

function chartCard(title,canvasId,height=220){
    return`<div class="dash-chart-card">
        <div class="dash-chart-title">${title}</div>
        <div style="position:relative;height:${height}px;"><canvas id="${canvasId}"></canvas></div>
    </div>`;
}

// ============================================================
function loadDashboard(){
    const el=document.getElementById('dashboardContent');
    if(!el)return;
    if(myRole==='Boss'||myRole==='Direktor') renderBossDashboard(el);
    else if(myRole==='Admin') renderAdminDashboard(el);
    else renderUserDashboard(el);
}

// ===== HODIM =====
function renderUserDashboard(el){
    const rec     = myFullRecords;
    const filtered= myFilteredRecords.length?myFilteredRecords:rec;
    const total   = totalUZS(rec);
    const usd     = totalUSD(rec);
    const avg     = avgMonthly(rec);
    const peak    = peakMonth(rec);
    const months6 = getLastNMonths(6);
    const txCount = rec.length;
    const usdCount= rec.filter(r=>Number(r.amountUSD)>0).length;
    const uzsCnt  = txCount-usdCount;

    // Top xarajat toifalari
    const byComment=sumByComment(rec);
    const catLabels=byComment.map(x=>x[0]);
    const catVals  =byComment.map(x=>x[1]);

    // Oy bo'yicha amallar soni
    const txPerMonth=months6.map(mo=>{
        return rec.filter(r=>{const d=parseDate(r.date);return d&&d.key===mo.key;}).length;
    });

    el.innerHTML=`
    <div class="dash-role-badge user">👤 Mening Statistikam</div>

    <div class="dash-stats-grid">
        ${statCard('💰','Jami Xarajat',fmtUZS(total)+' UZS','So\'mda hisoblaganda','#10B981')}
        ${statCard('💵','Dollar Xarajat','$'+usd.toLocaleString(),'','#F59E0B')}
        ${statCard('📅','Oylik O\'rtacha',fmtUZS(avg)+' UZS','','#3B82F6')}
        ${statCard('🏆','Eng Faol Oy',peak,'Eng ko\'p xarajat','#8B5CF6')}
        ${statCard('📋','Jami Amallar',txCount+' ta','Kiritilgan amallar','#EC4899')}
        ${statCard('💱','Valyuta Turlari',usdCount+'$ / '+uzsCnt+'₩','Dollar va so\'m','#14B8A6')}
    </div>

    ${chartCard('📊 Oxirgi 6 Oy Xarajat','chartUserMonthly',200)}
    ${chartCard('🥧 Valyuta Taqsimoti','chartUserDonut',230)}
    ${chartCard('📋 Top Xarajat Toifalari','chartUserCategory',Math.max(160,byComment.length*44))}
    ${chartCard('📈 Oylik Amallar Soni','chartUserTxCount',160)}
    `;

    // Monthly bar
    makeBar('chartUserMonthly',
        months6.map(m=>m.label),
        [{label:'Xarajat',data:sumByMonthKey(rec,months6),
          backgroundColor:months6.map((_,i)=>i===months6.length-1?'#10B981':'#BFDBFE'),
          borderRadius:8,borderSkipped:false}]
    );

    // Donut
    const pUZS=pureUZS(rec), cUZS=convUZS(rec);
    if(pUZS>0||cUZS>0) makeDonut('chartUserDonut',["So'm","Dollar (UZS)"],[pUZS,cUZS],['#10B981','#F59E0B']);
    else document.getElementById('chartUserDonut').parentElement.innerHTML='<div class="dash-empty">Ma\'lumot yo\'q</div>';

    // Category horizontal bar
    if(byComment.length) makeHBar('chartUserCategory',catLabels,catVals,PALETTE);
    else document.getElementById('chartUserCategory').parentElement.innerHTML='<div class="dash-empty">Ma\'lumot yo\'q</div>';

    // Tx count line
    makeLine('chartUserTxCount',
        months6.map(m=>m.label),
        [{label:'Amallar soni',data:txPerMonth,
          borderColor:'#8B5CF6',backgroundColor:'rgba(139,92,246,0.08)',
          borderWidth:2.5,pointRadius:5,pointBackgroundColor:'#8B5CF6',fill:true,tension:0.4}]
    );
}

// ===== ADMIN =====
function renderAdminDashboard(el){
    const all=globalAdminData, my=myFullRecords;
    if(!all.length){
        el.innerHTML=`<div class="dash-empty" style="padding:60px 20px;"><div style="font-size:40px">📊</div><p>Avval Admin panelni yuklang</p></div>`;
        return;
    }
    const months6 =getLastNMonths(6);
    const byEmp   =sumByEmployee(all).slice(0,7);
    const allTotal=totalUZS(all), myTotal=totalUZS(my);
    const empCount=new Set(all.map(r=>r.name)).size;

    el.innerHTML=`
    <div class="dash-role-badge admin">🛡 Admin Statistikasi</div>

    <div class="dash-section-title">🏢 Kompaniya</div>
    <div class="dash-stats-grid">
        ${statCard('💰','Jami Budjet',fmtUZS(allTotal)+' UZS','','#10B981')}
        ${statCard('👥','Xodimlar',empCount+' nafar','','#3B82F6')}
        ${statCard('📋','Amallar',all.length+' ta','','#8B5CF6')}
        ${statCard('👤','Ulushim',myTotal>0?Math.round(myTotal/allTotal*100)+'%':'0%','Kompaniya budjetidan','#F59E0B')}
    </div>
    ${chartCard('📈 Oylik Trend','chartAdminTrend',210)}
    ${chartCard('🏅 Xodimlar Reytingi','chartAdminEmp',Math.max(180,byEmp.length*46))}

    <div class="dash-section-title">👤 Mening Statistikam</div>
    <div class="dash-stats-grid">
        ${statCard('💰','Mening Xarajatim',fmtUZS(myTotal)+' UZS','','#10B981')}
        ${statCard('📅','Oylik O\'rtacha',fmtUZS(avgMonthly(my))+' UZS','','#3B82F6')}
        ${statCard('🏆','Eng Faol Oy',peakMonth(my)||'—','','#8B5CF6')}
        ${statCard('📋','Jami Amallarim',my.length+' ta','','#EC4899')}
    </div>
    ${chartCard('📊 Mening 6-Oylik Xarajatim','chartAdminMy',190)}
    `;

    makeLine('chartAdminTrend',months6.map(m=>m.label),
        [{label:'Kompaniya',data:sumByMonthKey(all,months6),
          borderColor:'#3B82F6',backgroundColor:'rgba(59,130,246,0.08)',
          borderWidth:2.5,pointRadius:5,pointBackgroundColor:'#3B82F6',fill:true,tension:0.4}]);

    makeHBar('chartAdminEmp',byEmp.map(e=>e[0].split(' ')[0]),byEmp.map(e=>e[1]),PALETTE);

    makeBar('chartAdminMy',months6.map(m=>m.label),
        [{label:'Mening xarajatim',data:sumByMonthKey(my,months6),
          backgroundColor:'#10B981',borderRadius:8,borderSkipped:false}]);
}

// ===== BOSS / DIREKTOR =====
function renderBossDashboard(el){
    const all=globalAdminData;
    if(!all.length){
        el.innerHTML=`<div class="dash-empty" style="padding:60px 20px;"><div style="font-size:40px">📊</div><p>Avval Admin → Xarajatlar bo'limini oching</p></div>`;
        return;
    }
    const months6=getLastNMonths(6), months12=getLastNMonths(12);
    const byEmp=sumByEmployee(all).slice(0,8);
    const allTotal=totalUZS(all), allUSD=totalUSD(all);
    const empCount=new Set(all.map(r=>r.name)).size;

    const m6UZSonly=months6.map(mo=>all.filter(r=>{const d=parseDate(r.date);return d&&d.key===mo.key&&!Number(r.amountUSD);}).reduce((s,r)=>s+(Number(r.amountUZS)||0),0));
    const m6USDconv=months6.map(mo=>all.filter(r=>{const d=parseDate(r.date);return d&&d.key===mo.key&&Number(r.amountUSD)>0;}).reduce((s,r)=>s+(Number(r.amountUZS)||0),0));

    el.innerHTML=`
    <div class="dash-role-badge boss">${myRole==='Boss'?'👑 Boss':'🎯 Direktor'} — Umumiy Ko'rinish</div>

    <div class="dash-stats-grid">
        ${statCard('💰','Jami Budjet',fmtUZS(allTotal)+' UZS','','#10B981')}
        ${statCard('💵','Dollar Xarajat','$'+allUSD.toLocaleString(),'','#F59E0B')}
        ${statCard('👥','Xodimlar',empCount+' nafar','','#3B82F6')}
        ${statCard('📋','Amallar',all.length+' ta','','#8B5CF6')}
        ${statCard('📅','Oylik O\'rtacha',fmtUZS(avgMonthly(all))+' UZS','','#EC4899')}
        ${statCard('🏆','Eng Faol Oy',peakMonth(all)||'—','','#14B8A6')}
    </div>

    ${chartCard('📈 12 Oylik Trend','chartBossTrend',220)}
    ${chartCard('🥧 Valyuta Taqsimoti','chartBossDonut',250)}
    ${chartCard('🏅 Top Xodimlar','chartBossEmp',Math.max(200,byEmp.length*50))}
    ${chartCard('📊 6 Oy (So\'m / Dollar)','chartBossBar6',220)}
    `;

    makeLine('chartBossTrend',months12.map(m=>m.label),
        [{label:'Jami',data:sumByMonthKey(all,months12),
          borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.07)',
          borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#10B981',fill:true,tension:0.4}]);

    makeDonut('chartBossDonut',["Faqat So'm","Dollar (so'mga)"],[pureUZS(all),convUZS(all)],['#10B981','#F59E0B']);

    makeHBar('chartBossEmp',byEmp.map(e=>e[0].split(' ')[0]),byEmp.map(e=>e[1]),byEmp.map((_,i)=>PALETTE[i%PALETTE.length]));

    makeBar('chartBossBar6',months6.map(m=>m.label),
        [{label:"So'm",data:m6UZSonly,backgroundColor:'#10B981',borderRadius:6,borderSkipped:false},
         {label:"Dollar",data:m6USDconv,backgroundColor:'#F59E0B',borderRadius:6,borderSkipped:false}],true);
}