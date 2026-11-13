const fs = require('fs');
let c = fs.readFileSync('src/routes/headcount.routes.js', 'utf8');
c = c.replace(
  'JOIN plants p ON p.id = s.plant_id\n    WHERE s.tenant_id = $1\n    ORDER BY p.name: row.name',
  'JOIN plants p ON p.id = s.plant_id\n    WHERE s.tenant_id = $1\n    ORDER BY p.name'
);
// Also add p.name to the SELECT
c = c.replace(
  'SELECT s.*,\n           p.plant_name,',
  'SELECT s.*,\n           p.name AS plant_name,'
);
// In case plant_name was already removed
c = c.replace(
  'SELECT s.*,\n           (SELECT json_agg',
  'SELECT s.*,\n           p.name AS plant_name,\n           (SELECT json_agg'
);
fs.writeFileSync('src/routes/headcount.routes.js', c);
console.log('done');
