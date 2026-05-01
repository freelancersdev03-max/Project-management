const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, "client/public/DDTME_BMD - May'26.xlsx");
const workbook = XLSX.readFile(filePath, { type: 'array' });

const activeTabIdx = workbook.Workbook?.WBView?.[0]?.activeTab || 0;
const sheetName = workbook.SheetNames[activeTabIdx] || workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

const isNonEmptyExcelRow = (row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== '');
const allDataRowsRaw = rows.slice(1).filter(isNonEmptyExcelRow); // Simplified for testing

let cutOffIndex = -1;
for (let i = 0; i < allDataRowsRaw.length; i++) {
    const rowText = allDataRowsRaw[i].map(c => String(c || '').toLowerCase().trim()).join(' ');
    if (rowText.includes('total hours') || rowText.includes('fixed tasks / other task') || rowText.includes('total bmd man days')) {
        cutOffIndex = i;
        break;
    }
}
const allDataRows = cutOffIndex !== -1 ? allDataRowsRaw.slice(0, cutOffIndex) : allDataRowsRaw;

console.log(`Sheet Name: ${sheetName}`);
console.log(`Rows before cutoff: ${allDataRowsRaw.length}`);
console.log(`Cutoff index: ${cutOffIndex}`);
console.log(`Rows after cutoff: ${allDataRows.length}`);
if (allDataRows.length > 0) {
    console.log(`Last valid row deliverable: ${allDataRows[allDataRows.length - 1][2]}`);
}
