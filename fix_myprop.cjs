const fs = require('fs');
const path = 'c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/MyProposals.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldBlock = `<div className="row g-4 mb-4">
          <div className="col-xl-8 mx-auto">
            <div className="mb-4">
              <h1 className="fw-bold fs-3 mb-1">My Proposals</h1>
              <p className="text-muted small mb-0">
                Track every bid you've sent, and manage the ones still in play.
              </p>
            </div>`;
            
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

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(path, content);
console.log("MyProposals layout fixed");
