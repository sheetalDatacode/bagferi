const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

// Update adminMenu.json
const adminMenuPath = path.join(rootDir, 'frontend/src/modules/Admin/config/adminMenu.json');
if (fs.existsSync(adminMenuPath)) {
    let adminMenu = JSON.parse(fs.readFileSync(adminMenuPath, 'utf8'));
    adminMenu = adminMenu.filter(item => {
        return !['Lot Slots', 'Properties', 'Job Categories', 'Job Listings', 'Add-on Plans'].includes(item.title);
    });
    fs.writeFileSync(adminMenuPath, JSON.stringify(adminMenu, null, 2));
    console.log('Cleaned adminMenu.json');
}

// Update b2bVendorMenu.json
const vendorMenuPath = path.join(rootDir, 'frontend/src/modules/B2BVendor/config/b2bVendorMenu.json');
if (fs.existsSync(vendorMenuPath)) {
    let vendorMenu = JSON.parse(fs.readFileSync(vendorMenuPath, 'utf8'));
    vendorMenu = vendorMenu.filter(item => {
        return !['Property Management', 'Lot/Slot Listings', 'Jobs'].includes(item.title);
    });
    fs.writeFileSync(vendorMenuPath, JSON.stringify(vendorMenu, null, 4));
    console.log('Cleaned b2bVendorMenu.json');
}
