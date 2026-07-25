const fs = require('fs');
const content = fs.readFileSync('c:/Users/HP/Desktop/appzeto_first/Bagferi/frontend/src/modules/B2BUserApp/pages/ProductCatalog.jsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('isBusinessTypeDropdownOpen')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
