// ================= ROL BOSHQARUVI (SuperAdmin uchun) =================

async function loadAdmins() {
    document.getElementById('rolesList').innerHTML = `
        <div class="skeleton skeleton-item"></div>
        <div class="skeleton skeleton-item"></div>`;
    try {
        const res  = await fetch(API_URL, { method:'POST', body:JSON.stringify({ action:'get_admins', telegramId }) });
        const data = await res.json();
        if (data.success) {
            let html = '';
            data.data.forEach(r => {
                const badgeClass = r.role==='SuperAdmin'?'boss' : r.role==='Direktor'?'direktor' : 'admin';
                const isAdmin    = r.role === 'Admin';
                const perms      = r.permissions || {};

                // Admin uchun ruhsat checkboxlari
                const permHtml = isAdmin ? `
                <div class="perm-grid">
                    ${permCheck(r.rowId,'canViewAll',  perms.canViewAll,  "👁 Hammasini ko'rish")}
                    ${permCheck(r.rowId,'canEdit',     perms.canEdit,     "✏️ Tahrirlash")}
                    ${permCheck(r.rowId,'canDelete',   perms.canDelete,   "🗑 O'chirish")}
                    ${permCheck(r.rowId,'canExport',   perms.canExport,   "📥 Excel")}
                    ${permCheck(r.rowId,'canViewDashboard', perms.canViewDashboard, "📈 Dashboard")}
                </div>
                <button class="perm-save-btn" onclick="savePermissions(${r.rowId})">💾 Saqlash</button>
                ` : '';

                html += `
                <div class="role-item" style="flex-direction:column;align-items:stretch;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${isAdmin?'12':'0'}px;">
                        <div class="role-item-left">
                            <span class="role-item-name">${r.name}</span>
                            <span class="role-item-id">ID: ${r.tgId}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="role-badge ${badgeClass}">${r.role}</span>
                            <button class="del-icon-btn" onclick="delAdmin(${r.rowId})">🗑</button>
                        </div>
                    </div>
                    ${permHtml}
                </div>`;
            });
            document.getElementById('rolesList').innerHTML =
                html || `<div class="empty-state"><div class="empty-icon">👥</div><p>Hali rol belgilanmagan</p></div>`;
        }
    } catch {
        document.getElementById('rolesList').innerHTML =
            `<div class="empty-state"><p style="color:var(--red);">❌ Yuklanmadi</p></div>`;
    }
}

function permCheck(rowId, field, val, label) {
    return `<label class="perm-label">
        <input type="checkbox" id="perm_${rowId}_${field}" ${val?'checked':''}>
        <span>${label}</span>
    </label>`;
}

async function savePermissions(rowId) {
    const fields = ['canViewAll','canEdit','canDelete','canExport','canViewDashboard'];
    const permissions = {};
    fields.forEach(f => {
        const el = document.getElementById(`perm_${rowId}_${f}`);
        if (el) permissions[f] = el.checked;
    });
    try {
        const res  = await fetch(API_URL, { method:'POST', body:JSON.stringify({ action:'update_permissions', telegramId, rowId, permissions }) });
        const data = await res.json();
        if (data.success) {
            showToast('✅ Ruhsatlar saqlandi!');
        } else {
            showToast('❌ ' + (data.error||'Xato'), true);
        }
    } catch {
        showToast('❌ Server xatosi', true);
    }
}

function showToast(msg, isErr=false) {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        document.body.appendChild(t);
    }
    t.innerText = msg;
    t.className = 'toast' + (isErr?' toast-err':'');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
}

async function addAdmin() {
    const st      = document.getElementById('adminStatus');
    const newTgId = document.getElementById('newAdminId').value.trim();
    const newName = document.getElementById('newAdminName').value.trim() || 'Yangi Xodim';
    const newRole = document.getElementById('newAdminRole').value;
    if (!newTgId) { st.style.color='var(--red)'; st.innerText='❗ Telegram ID kiritilishi shart!'; return; }
    st.style.color='var(--text-muted)'; st.innerText='⏳ Qo\'shilmoqda...';
    try {
        const res  = await fetch(API_URL, { method:'POST', body:JSON.stringify({ action:'add_admin', telegramId, newTgId, newName, newRole }) });
        const data = await res.json();
        if (data.success) {
            st.style.color='var(--green-dark)'; st.innerText='✅ Muvaffaqiyatli qo\'shildi!';
            document.getElementById('newAdminId').value=''; document.getElementById('newAdminName').value='';
            loadAdmins();
        } else { st.style.color='var(--red)'; st.innerText='❌ '+(data.error||'Xato'); }
    } catch { st.style.color='var(--red)'; st.innerText='❌ Server bilan bog\'lanib bo\'lmadi'; }
}

async function delAdmin(rowId) {
    if (!confirm("Bu rolni o'chirishga ishonchingiz komilmi?")) return;
    try {
        const res  = await fetch(API_URL, { method:'POST', body:JSON.stringify({ action:'del_admin', telegramId, rowId }) });
        const data = await res.json();
        if (data.success) loadAdmins(); else alert('❌ '+(data.error||"O'chirishda xato"));
    } catch { alert('❌ Server bilan bog\'lanib bo\'lmadi'); }
}