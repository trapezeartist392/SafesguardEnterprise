const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/factory-compliance.jsx', 'utf8');

// Add import after TrainingRecommendations import
c = c.replace(
  "import TrainingRecommendations from './TrainingRecommendations';",
  "import TrainingRecommendations from './TrainingRecommendations';\nimport HeadcountDashboard from './HeadcountDashboard';"
);

// Add nav entry after Training nav entry
c = c.replace(
  '{icon:"??",name:"Training", pg:"training"}',
  '{icon:"??",name:"Training", pg:"training"},\n                {icon:"??",name:"Headcount", pg:"headcount"}'
);

// Add page render after training block
c = c.replace(
  '{page==="training" && (\n              <TrainingRecommendations/>\n            )}',
  '{page==="training" && (\n              <TrainingRecommendations/>\n            )}\n            {page==="headcount" && (\n              <HeadcountDashboard/>\n            )}'
);

fs.writeFileSync('frontend/src/components/factory-compliance.jsx', c);
console.log('done');
