const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/modules/Admin/pages/b2b-vendors/BusinessTypeConfiguration.jsx');
let content = fs.readFileSync(file, 'utf8');

// Remove imports
content = content.replace(/import\s+\{\s*getAddonPlans\s*\}\s+from\s+['"][^'"]+b2bAddonManager['"];?\s*/g, '');

// Remove allAddons state
content = content.replace(/const\s+\[allAddons,\s+setAllAddons\]\s*=\s*useState\(\[\]\);\s*/g, '');

// Remove fetchAddons call
content = content.replace(/fetchAddons\(\);\s*/g, '');

// Remove fetchAddons function
content = content.replace(/const\s+fetchAddons\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?setAllAddons\(data\s*\|\|\s*\[\]\);[\s\S]*?catch\s*\(error\)\s*\{[\s\S]*?\}[\s\S]*?\};\s*/g, '');

// Remove allowedAddonPlans references
content = content.replace(/allowedAddonPlans:\s*Array\.isArray\(settings\.allowedAddonPlans\)\s*\?\s*settings\.allowedAddonPlans\.map\(a\s*=>\s*String\(a\._id\s*\|\|\s*a\)\)\s*:\s*\[\],/g, '');
content = content.replace(/allowedAddonPlans:\s*Array\.isArray\(editingSettings\.allowedAddonPlans\)\s*\?\s*editingSettings\.allowedAddonPlans\s*:\s*\[\],/g, '');

// Remove toggleAddonStep function
content = content.replace(/const\s+toggleAddonStep\s*=\s*\(addonId\)\s*=>\s*\{[\s\S]*?setEditingSettings\(\{[\s\S]*?allowedAddonPlans:\s*nextAddons\s*\}\);\s*\};\s*/g, '');

// Remove Allowed Add-on Packs section completely
// Finding the block: {/* Allowed Add-on Packs */} to the next { /* 
content = content.replace(/\{\/\*\s*Allowed Add-on Packs\s*\*\/\}([\s\S]*?)(?=\{\/\*|\<\/div\>\s*\<\/div\>\s*\<\/div\>\s*\<\/motion\.div\>)/g, (match, p1) => {
    return '';
});

// Remove any remaining allAddons references
fs.writeFileSync(file, content, 'utf8');
console.log('Cleaned BusinessTypeConfiguration.jsx');
