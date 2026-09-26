const fs = require('fs');

let createJobPath = 'c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/CreateJob.jsx';
let lines = fs.readFileSync(createJobPath, 'utf8').split('\n');
lines[lines.length - 3] = '    </>'; // line 191 is at index 190
fs.writeFileSync(createJobPath, lines.join('\n'));

console.log("CreateJob fixed.");
