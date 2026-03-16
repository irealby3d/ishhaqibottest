// ================= 5. EXCEL EKSPORT =================

async function exportToBot(dataList, fileNameBase) {
    if (!dataList || dataList.length === 0) {
        return alert("Eksport uchun ma'lumot yo'q!");
    }

    tg.MainButton.setText("Fayl botga yuborilmoqda...").show();

    // FIX 2: Kurs ustuni to'g'ri – dollar bo'lsa rate, bo'lmasa "-"
    const exportData = dataList.map(r => {
        const isUsd = Number(r.amountUSD) > 0;
        return {
            "Sana":        r.date       || "",
            "Xodim":       r.name       || employeeName,
            "Izoh":        r.comment    || "",
            "Summa (UZS)": Number(r.amountUZS) || 0,
            "Summa (USD)": Number(r.amountUSD) || 0,
            "Kurs (UZS)":  isUsd ? (Number(r.rate) || "Ko'rsatilmagan") : "-"
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
        { wch: 12 }, { wch: 22 }, { wch: 35 },
        { wch: 16 }, { wch: 14 }, { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hisobot");
    const base64   = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    const fileName = `${fileNameBase}_${new Date().toISOString().slice(0,10)}.xlsx`;

    try {
        const res    = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "export_to_bot", telegramId, base64, fileName })
        });
        const result = await res.json();
        tg.MainButton.hide();
        if (result.success) {
            tg.showAlert("✅ Hisobot shaxsiy xabaringizga (Botdan) yuborildi!");
        } else {
            throw new Error(result.error || "Yuborishda xatolik");
        }
    } catch (err) {
        tg.MainButton.hide();
        alert("❌ Xatolik: " + err.message);
    }
}

// Xodim o'z hisobotini yuklab oladi
function exportMyExcel() {
    exportToBot(myFilteredRecords, `Hisobot_${employeeName}`);
}

// FIX 3: Admin paneldan — agar bitta hodim filtrlangan bo'lsa,
//         fayl nomi o'sha hodim ismi bilan boshlanadi
function exportAdminExcel() {
    const empSelect = document.getElementById('filterEmployee');
    const empVal    = empSelect ? empSelect.value : 'all';

    let baseName;
    if (empVal !== 'all') {
        // Bitta hodim tanlangan — ism bilan
        baseName = `Hisobot_${empVal}`;
    } else {
        // Hamma ko'rsatilgan — umumiy nom
        baseName = "Kompaniya_Umumiy_Hisoboti";
    }

    exportToBot(filteredData, baseName);
}