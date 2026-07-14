const fs = require('fs');
const path = 'C:\\Users\\HP\\Desktop\\appzeto_first\\dealing-india\\backend\\controllers\\heroBanner.controller.js';
let content = fs.readFileSync(path, 'utf8');

// Fix syntax error at end of confirmPayment
const targetSnippet = `        message: 'Payment confirmed successfully. Awaiting admin approval.',\n        data: booking\n    });\n});`;
const replacementSnippet = `        message: 'Payment confirmed successfully. Awaiting admin approval.',\n        data: booking\n    });\n  } catch (error) {\n    next(error);\n  }\n});`;

if (content.includes(targetSnippet)) {
    content = content.replace(targetSnippet, replacementSnippet);
    console.log('Fixed syntax error.');
} else {
    console.log('Target snippet not found for syntax fix.');
}

// Fix undefined amount variabes
content = content.replace(/totalAmount: amount,/g, 'amount: booking.amount,');

fs.writeFileSync(path, content, 'utf8');
console.log('Finished fixing file.');
