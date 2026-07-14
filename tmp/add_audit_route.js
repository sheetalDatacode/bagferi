const fs = require('fs');
const path = 'C:\\Users\\HP\\Desktop\\appzeto_first\\dealing-india\\backend\\server.js';
let content = fs.readFileSync(path, 'utf8');

const targetLine = 'app.get("/api/health", (req, res) => {';
const insertion = `
// Integration Audit Dashboard (Added for Zoho Debugging)
app.get("/admin/integration-audit", (req, res) => {
  res.sendFile(require('path').join(process.cwd(), "public", "integration-audit.html"));
});
`;

if (content.includes(targetLine)) {
    content = content.replace(targetLine, insertion + targetLine);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Added audit route to server.js');
} else {
    console.log('Target line not found in server.js');
}
