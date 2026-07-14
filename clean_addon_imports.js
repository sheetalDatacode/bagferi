const fs = require('fs');

const filesToClean = [
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\services\\subscriptionRules.service.js',
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\controllers\\vendorAnalytics.controller.js',
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\controllers\\b2bVendorProducts.controller.js',
    'c:\\Users\\HP\\Desktop\\appzeto_first\\Bagferi\\backend\\controllers\\reel.controller.js'
];

for (const file of filesToClean) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');

    // For static imports
    content = content.replace(
        /import\s+vendorAddonService\s+from\s+['"]\.\.?\/services\/vendorAddon\.service\.js['"];?/g,
        'const vendorAddonService = { getTotalAvailableAddonUnits: async () => 0, deductAddonUsage: async () => {} };'
    );

    // For dynamic imports
    content = content.replace(
        /const\s+vendorAddonService\s*=\s*\(await\s+import\(['"]\.\.?\/services\/vendorAddon\.service\.js['"]\)\)\.default;/g,
        'const vendorAddonService = { getTotalAvailableAddonUnits: async () => 0, deductAddonUsage: async () => {} };'
    );

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Cleaned ${file}`);
}
