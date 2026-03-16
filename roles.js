// ================= 7. ROL BOSHQARUVI =================

async function loadAdmins() {
    document.getElementById('rolesList').innerHTML = "<p class='text-center'>Yuklanmoqda... ⏳</p>";
    try {
        const res  = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_admins", telegramId })
        });
        const data = await res.json();
        if (data.success) {
            let html = '';
            data.data.forEach(r => {
                const badgeColor = r.role === 'Boss'     ? '#d84315'
                                 : r.role === 'Direktor' ? '#00838f'
                                                         : '#2a5298';
                html += `
                <div class="history-item">
                    <div>
                        <strong>${r.name}</strong>
                        <br>
                        <span style="font-size:11px;color:#888;">ID: ${r.tgId}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="background:${badgeColor};color:#fff;padding:4px 8px;border-radius:8px;font-size:11px;font-weight:bold;">
                            ${r.role}
                        </span>
                        <br>
                        <button class="del-btn" style="padding:4px 10px;width:auto;margin-top:5px;"
                                onclick="delAdmin(${r.rowId})">🗑</button>
                    </div>
                </div>`;
            });
            document.getElementById('rolesList').innerHTML =
                html || "<p class='text-center' style='color:#888;'>Hali rol belgilanmagan</p>";
        }
    } catch (e) {
        console.error("Rollar yuklanmadi:", e);
        document.getElementById('rolesList').innerHTML =
            "<p class='text-center' style='color:red;'>❌ Yuklanmadi</p>";
    }
}

async function addAdmin() {
    const st      = document.getElementById('adminStatus');
    const newTgId = document.getElementById('newAdminId').value.trim();
    const newName = document.getElementById('newAdminName').value.trim() || "Yangi Xodim";
    const newRole = document.getElementById('newAdminRole').value;

    if (!newTgId) {
        st.style.color = "red";
        st.innerText   = "ID raqami yozilishi shart!";
        return;
    }

    st.style.color = "#888";
    st.innerText   = "Qo'shilmoqda...";

    try {
        const res  = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "add_admin", telegramId, newTgId, newName, newRole })
        });
        const data = await res.json();
        if (data.success) {
            st.style.color = "green";
            st.innerText   = "✅ Muvaffaqiyatli qo'shildi!";
            document.getElementById('newAdminId').value   = '';
            document.getElementById('newAdminName').value = '';
            loadAdmins();
        } else {
            st.style.color = "red";
            st.innerText   = "❌ " + (data.error || "Xato yuz berdi");
        }
    } catch (e) {
        st.style.color = "red";
        st.innerText   = "❌ Server bilan bog'lanib bo'lmadi";
    }
}

async function delAdmin(rowId) {
    if (!confirm("Bu rolni o'chirishga ishonchingiz komilmi?")) return;
    try {
        const res  = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "del_admin", telegramId, rowId })
        });
        const data = await res.json();
        if (data.success) {
            loadAdmins();
        } else {
            alert("❌ " + (data.error || "O'chirishda xato"));
        }
    } catch (e) {
        alert("❌ Server bilan bog'lanib bo'lmadi");
    }
}