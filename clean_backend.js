const fs = require('fs');

const files = [
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\controllers\\adminDashboard.controller.js',
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\controllers\\adminTransactions.controller.js',
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\controllers\\b2bVendorDashboard.controller.js',
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\controllers\\vendorManagement.controller.js',
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\services\\adminB2BAnalytics.service.js',
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\services\\b2bLocation.service.js',
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\services\\publicProduct.service.js',
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\services\\subscription.service.js',
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\services\\subscriptionRules.service.js',
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\services\\vendorManagement.service.js'
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');

    // Remove imports
    content = content.replace(/import\s+[A-Za-z0-9_]+\s+from\s+['"]\.\.?\/models\/(?:Property|LotSlot|Job|VendorAddon|B2BAddonPlan|JobCategory)\.model\.js['"];?\s*/g, '');

    // Replace countDocuments
    content = content.replace(/(?:Property|LotSlot|Job|VendorAddon|B2BAddonPlan|JobCategory)\.countDocuments\([^)]*\)/g, '0');

    // Replace find() with chained methods
    content = content.replace(/(?:Property|LotSlot|Job|VendorAddon|B2BAddonPlan|JobCategory)\.find\([^)]*\)(?:\.populate\([^)]*\))?(?:\.sort\([^)]*\))?(?:\.limit\([^)]*\))?(?:\.lean\(\))?/g, '[]');

    // Replace aggregate
    // Aggregate usually takes an array, so it could span multiple lines.
    // Instead of regex matching the entire array, we can match:
    // (?:Property|LotSlot|Job|VendorAddon|B2BAddonPlan|JobCategory)\.aggregate\(\[[\s\S]*?\]\)
    content = content.replace(/(?:Property|LotSlot|Job|VendorAddon|B2BAddonPlan|JobCategory)\.aggregate\(\[[\s\S]*?\]\)/g, '[]');

    // Replace findById
    content = content.replace(/(?:Property|LotSlot|Job|VendorAddon|B2BAddonPlan|JobCategory)\.findById\([^)]*\)(?:\.select\([^)]*\))?(?:\.lean\(\))?/g, 'null');

    // Replace deleteMany
    content = content.replace(/(?:Property|LotSlot|Job|VendorAddon|B2BAddonPlan|JobCategory)\.deleteMany\([^)]*\)/g, '{ deletedCount: 0 }');

    // Replace findOne
    content = content.replace(/(?:Property|LotSlot|Job|VendorAddon|B2BAddonPlan|JobCategory)\.findOne\([^)]*\)(?:\.select\([^)]*\))?(?:\.lean\(\))?/g, 'null');

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Cleaned ${file}`);
}
