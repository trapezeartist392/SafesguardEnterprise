const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/factory-compliance.jsx', 'utf8');

// 1. Add import after line 6
const importTarget = `import TrainingRecommendations from "./TrainingRecommendations";`;
const importReplace = `import TrainingRecommendations from "./TrainingRecommendations";\nimport HeadcountDashboard from "./HeadcountDashboard";`;
c = c.replace(importTarget, importReplace);

// 2. Add nav entry after Training nav entry (match exact spacing)
const navTarget = `{icon:"??",name:"Training",       pg:"training"}`;
const navReplace = `{icon:"??",name:"Training",       pg:"training"},\n      {icon:"??",name:"Headcount",  pg:"headcount"}`;
c = c.replace(navTarget, navReplace);

// 3. Add page render — insert after the training closing })
const renderTarget = `{page==="training" && (\n            <TrainingRecommendations/>\n          )}`;
const renderReplace = `{page==="training" && (\n            <TrainingRecommendations/>\n          )}\n          {page==="headcount" && (\n            <HeadcountDashboard/>\n          )}`;
c = c.replace(renderTarget, renderReplace);

fs.writeFileSync('frontend/src/components/factory-compliance.jsx', c);

// Report what changed
const matches = {
  import: c.includes('HeadcountDashboard from "./HeadcountDashboard"'),
  nav: c.includes('pg:"headcount"'),
  render: c.includes('page==="headcount"'),
};
console.log(JSON.stringify(matches));
