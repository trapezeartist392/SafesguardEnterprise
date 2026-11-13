const fs = require('fs');
let c = fs.readFileSync('src/routes/headcount.routes.js', 'utf8');
c = c.replace('p.plant_name', 'p.name');
c = c.replace('plant_name', 'plant_name: row.name').replace(/ORDER BY p\.plant_name/, 'ORDER BY p.name');
fs.writeFileSync('src/routes/headcount.routes.js', c);
console.log('done');
