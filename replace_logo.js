const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const directories = ['frontend/src', 'frontend/public', 'frontend/index.html', 'backend'];

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/bagferi-logo\.png/g, 'bagferi.png');
    
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
    traverseDir(path.join(rootDir, dir));
});

console.log('Done replacing logo references.');
