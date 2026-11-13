const content = require('fs').readFileSync('src/app.js', 'utf8');
const insert = `const headcountRoutes = require('./routes/headcount.routes');\napp.use(\`\${v1}/headcount\`, requireLicense, headcountRoutes);\n\n`;
const updated = content.replace("app.use(`${v1}/training`", insert + "app.use(`${v1}/training`");
require('fs').writeFileSync('src/app.js', updated);
console.log('done');
