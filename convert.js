const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const workbook = XLSX.readFile(path.join(__dirname, 'snifim_he.xlsx'));
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

fs.writeFileSync(path.join(__dirname, 'data', 'snifim.json'), JSON.stringify(data, null, 2));
console.log('Conversion successful. Total rows:', data.length);
console.log('Sample row:', data[0]);
