// 2. Dastlabki yuklanish (Init)
window.onload = async () => {
    document.getElementById('greeting').innerText = `Salom, ${user ? user.first_name : 'Xodim'}!`;
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "init", telegramId }) });
        const data = await res.json();
        if (data.success) {
            myFullRecords = data.data;
            initMyFilters(); // Shaxsiy filtrlarni tayyorlash
            
            // Rollarni aniqlash
            if (data.isBoss) myRole = 'Boss';
            else if (data.isAdmin) myRole = 'Admin';
            else if (data.isDirector) myRole = 'Direktor';

            if (myRole !== 'User') document.getElementById('nav-admin').classList.remove('hidden');
            if (myRole === 'Boss') document.getElementById('bossNav').classList.remove('hidden');
        }
    } catch (e) { console.error("Yuklashda xato:", e); }
};

// Menyularni almashtirish
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
