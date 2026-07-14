const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function findImports(dir, models) {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results = results.concat(findImports(fullPath, models));
        } else if (fullPath.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const model of models) {
                if (content.includes(`/${model}.model.js`)) {
                    results.push(fullPath);
                    break;
                }
            }
        }
    }
    return results;
}

const backendDir = path.join(__dirname, 'backend');
const models = ['Property', 'LotSlot', 'Job', 'VendorAddon', 'B2BAddonPlan', 'JobCategory'];
const filesWithImports = findImports(backendDir, models);

console.log(filesWithImports.join('\n'));
