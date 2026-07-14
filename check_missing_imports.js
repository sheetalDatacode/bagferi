const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'backend');
const deletedFiles = [
    'Property.model.js', 'LotSlot.model.js', 'Job.model.js',
    'VendorAddon.model.js', 'B2BAddonPlan.model.js', 'JobCategory.model.js',
    'vendorAddon.service.js', 'b2bAddonPlan.controller.js', 'job.controller.js',
    'property.controller.js', 'lotSlot.controller.js', 'b2bAddon.controller.js'
];

function checkDir(d) {
    const files = fs.readdirSync(d);
    for (const f of files) {
        const fullPath = path.join(d, f);
        if (fs.statSync(fullPath).isDirectory()) {
            checkDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const df of deletedFiles) {
                if (content.includes(df)) {
                    console.log(`Found ${df} in ${fullPath}`);
                }
            }
        }
    }
}

checkDir(dir);
