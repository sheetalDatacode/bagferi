const fs = require('fs');
const content = fs.readFileSync('c:/Users/HP/Desktop/appzeto_first/dealing-india/frontend/src/modules/B2BVendor/components/VillaForm.jsx', 'utf8');

let braceCount = 0;
let lineNum = 1;
let colNum = 0;
const stack = [];

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '\n') {
        lineNum++;
        colNum = 0;
    } else {
        colNum++;
    }

    if (char === '{') {
        stack.push({ line: lineNum, col: colNum });
    } else if (char === '}') {
        if (stack.length === 0) {
            console.log(`Unmatched closing brace at line ${lineNum}, col ${colNum}`);
        } else {
            stack.pop();
        }
    }
}

if (stack.length > 0) {
    console.log('Unmatched opening braces:');
    stack.forEach(s => console.log(`Line ${s.line}, col ${s.col}`));
} else {
    console.log('All braces matched!');
}
