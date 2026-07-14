const fs = require('fs');
const path = 'C:\\Users\\HP\\Desktop\\appzeto_first\\dealing-india\\backend\\controllers\\heroBanner.controller.js';
let content = fs.readFileSync(path, 'utf8');

// Use a simpler regex to find the problematic block
const regex = /res\.status\(200\)\.json\(\{\s+success: true,\s+message: 'Payment confirmed successfully\. Awaiting admin approval\.',\s+data: booking\s+\}\);\s+\}\);/;
const replacement = `        res.status(200).json({
            success: true,
            message: 'Payment confirmed successfully. Awaiting admin approval.',
            data: booking
        });
    } catch (integrationErr) {
        console.error('[BannerPay][Critical] Zoho/Email integration helper failed:', integrationErr.message);
    }
});`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    console.log('Fixed syntax error.');
} else {
    console.log('Syntax error pattern not found.');
}

// Fix undefined amount variabes
content = content.replace(/totalAmount: amount/g, 'amount: booking.amount');

fs.writeFileSync(path, content, 'utf8');
console.log('Finished fixing file.');
