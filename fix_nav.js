const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/factory-compliance.jsx', 'utf8');

// Find the Training nav line and insert Headcount after it
c = c.replace(
  /(.*name:"Training".*pg:"training"[^,]*,?\s*\n)(\s*\]\},)/,
  (match, trainingLine, closingLine) => {
    return trainingLine + '      {icon:"??",name:"Headcount",  pg:"headcount"},\n' + closingLine;
  }
);

fs.writeFileSync('frontend/src/components/factory-compliance.jsx', c);
const matches = { nav: c.includes('pg:"headcount"') };
console.log(JSON.stringify(matches));
