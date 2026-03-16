// 5. Excel Eksport
async function exportToBot(dataList, fileNameBase) {
    if (dataList.length === 0) return alert("Eksport uchun ma'lumot yo'q!");
    tg.MainButton.setText("Fayl botga yuborilmoqda...").show();
    
    const exportData = dataList.map(r => ({
        "Sana": r.date, "Xodim": r.name || employeeName, "Izoh": r.comment,
        "Summa UZS": Number(r.amountUZS), "Summa USD": Number(r.amountUSD), "Kurs": r.rate || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hisobot");
    const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

    const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "export_to_bot", telegramId, base64, fileName: `${fileNameBase}.xlsx` })
    });
    tg.MainButton.hide();
    tg.showAlert("✅ Hisobot botdan shaxsiy xabaringizga yuborildi!");
}

function exportMyExcel() { exportToBot(myFilteredRecords, `Mening_Hisobotim_${employeeName}`); }
function exportAdminExcel() { exportToBot(filteredData, "Kompaniya_Umumiy_Hisoboti"); }
