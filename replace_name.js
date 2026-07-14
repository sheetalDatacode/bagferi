const fs = require('fs');
const path = require('path');

const directories = ['frontend/src', 'frontend/public', 'frontend/index.html', 'frontend/package.json', 'backend', 'docs'];

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replacements
    content = content.replace(/Dealing India/g, 'Bagferi');
    content = content.replace(/dealing india/gi, 'bagferi'); // catches lowercase/mixed
    content = content.replace(/DealingIndia/g, 'Bagferi');
    content = content.replace(/dealing-india/g, 'bagferi');
    content = content.replace(/DEALING INDIA/g, 'BAGFERI');
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function traverseDir(dir) {
    if (!fs.existsSync(dir)) return;
    const stat = fs.statSync(dir);
    if (stat.isFile()) {
        replaceInFile(dir);
        return;
    }

    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            traverseDir(fullPath);
        } else {
            replaceInFile(fullPath);
        }
    }
}

directories.forEach(dir => {
    traverseDir(path.join(__dirname, dir));
});

console.log('Done replacing names.');
