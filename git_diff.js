const { execSync } = require('child_process');
try {
  const diff = execSync('git diff backend/controllers/reel.controller.js', { encoding: 'utf8' });
  console.log(diff);
} catch (e) {
  console.error(e.message);
}
