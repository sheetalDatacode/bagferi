const fs = require('fs');

function checkTags(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const lines = code.split('\n');
    const stack = [];
    const logs = [];
    
    // Simple regex to find JSX tags (basic tag matching)
    const tagRegex = /<\/?[a-zA-Z0-9\._\-]+(?:\s+[a-zA-Z0-9\-]+(?:=\{[^\}]*\}|="[^"]*"|='[^']*'|=[^\s>]+)?)*\s*\/?>/g;
    
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        let match;
        while ((match = tagRegex.exec(line)) !== null) {
            const tagText = match[0];
            const isClosing = tagText.startsWith('</');
            const isSelfClosing = tagText.endsWith('/>');
            
            if (isSelfClosing) continue;
            
            const tagNameMatch = tagText.match(/<\/?([a-zA-Z0-9\._\-]+)/);
            if (!tagNameMatch) continue;
            const tagName = tagNameMatch[1];
            
            if (tagText.includes('<!--') || tagText.includes('-->')) continue;
            
            if (isClosing) {
                if (stack.length === 0) {
                    logs.push(`Unmatched closing tag: ${tagText} at line ${lineIdx + 1}`);
                } else {
                    const top = stack.pop();
                    if (top.name !== tagName) {
                        logs.push(`Mismatched tags: opened ${top.text} at line ${top.line} but closed with ${tagText} at line ${lineIdx + 1}`);
                    }
                }
            } else {
                stack.push({ name: tagName, text: tagText, line: lineIdx + 1 });
            }
        }
    }
    
    logs.push("Remaining open tags in stack:");
    stack.forEach(t => logs.push(`  - ${t.text} at line ${t.line}`));
    
    fs.writeFileSync('check_output.txt', logs.join('\n'), 'utf8');
}

checkTags('frontend/src/modules/B2BVendor/components/ProductForm.jsx');
console.log("Check complete.");
