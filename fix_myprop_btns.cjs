const fs = require('fs');
const path = 'c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/MyProposals.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/className={`btn btn-sm rounded-pill px-3 py-1 \$\{/g, 'className={`btn rounded-pill px-4 py-2 flex-shrink-0 fw-medium ${');

fs.writeFileSync(path, content);
console.log("MyProposals buttons updated");
