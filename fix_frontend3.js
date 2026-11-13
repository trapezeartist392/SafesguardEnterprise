const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/factory-compliance.jsx', 'utf8');

// Nav: line 968 — note the trailing comma already exists now
const navTarget = `{icon:"??",name:"Training",       pg:"training"},`;
const navReplace = `{icon:"??",name:"Training",       pg:"training"},\n      {icon:"??",name:"Headcount",  pg:"headcount"},`;
c = c.replace(navTarget, navReplace);

// Render: line 1162 — 6 spaces indent
const renderTarget = `          {page==="training" && (\n            <TrainingRecommendations/>`;
const renderReplace = `          {page==="training" && (\n            <TrainingRecommendations/>`;
// Just append after the closing )}
c = c.replace(
  /(\s*\{page==="training" &&[\s\S]*?<TrainingRecommendations\/>[\s\S]*?\})/,
  (match) => match + '\n          {page==="headcount" && (\n            <HeadcountDashboard/>\n          )}'
);

fs.writeFileSync('frontend/src/components/factory-compliance.jsx', c);
const matches = {
  nav: c.includes('pg:"headcount"'),
  render: c.includes('page==="headcount"'),
};
console.log(JSON.stringify(matches));
