// Test what xlsx library sees from the Excel file
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, "client/public/DDTME_BMD - May'26.xlsx");
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log("Total rows:", rows.length);
console.log("\nRow 0 (headers):", JSON.stringify(rows[0]));
console.log("\nRow 1 (first data):", JSON.stringify(rows[1]));
console.log("\nRow 2:", JSON.stringify(rows[2]));

// Show all non-empty rows
for (let i = 0; i < Math.min(rows.length, 35); i++) {
    const row = rows[i];
    if (row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
        console.log(`\nRow ${i}: ${JSON.stringify(row)}`);
    }
}
