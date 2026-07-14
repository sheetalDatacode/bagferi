import fs from 'fs';
const path = 'backend/controllers/heroBanner.controller.js';
let content = fs.readFileSync(path, 'utf8');

// The goal is to remove the specific redundant 'try {' at line 243
// and fix the closing braces around the catch block.

const lines = content.split('\n');

// Verify line 243 (indexing is 0-based, so 242)
console.log('Line 243 check:', lines[242]);

if (lines[242].trim() === 'try {') {
    console.log('Removing redundant try at line 243');
    lines.splice(242, 1);
} else {
    console.log('Warning: Line 243 does not contain expected "try {"');
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Successfully updated file.');
