const fs = require('fs');
const path = 'c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/MyProposals.jsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /<div className="row g-4 mb-4">\s*<div className="col-xl-8 mx-auto">\s*<div className="mb-4">\s*<h1 className="fw-bold fs-3 mb-1">My Proposals<\/h1>\s*<p className="text-muted small mb-0">\s*Track every bid you've sent, and manage the ones still in play\.\s*<\/p>\s*<\/div>/;

const newBlock = `<div className="page-header d-flex justify-content-between align-items-center">
          <div>
            <h1 className="page-title">My Proposals</h1>
            <p className="page-subtitle">
              Track every bid you've sent, and manage the ones still in play.
            </p>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-12">`;

if (regex.test(content)) {
    content = content.replace(regex, newBlock);
    fs.writeFileSync(path, content);
    console.log("MyProposals replaced");
} else {
    console.log("MyProposals not matched");
}
