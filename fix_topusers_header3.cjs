const fs = require('fs');
let topUsersPath = 'c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/TopUsers.jsx';
let topUsers = fs.readFileSync(topUsersPath, 'utf8');

topUsers = topUsers.replace('<div className="row g-4 px-3 mb-4">', '<div className="row g-4 mb-4">');

// We just want to extract the header and put it before the row.
let lines = topUsers.split('\n');
let newLines = [];
let skipMode = false;
let headerAdded = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<div className="row g-4')) {
        if (!headerAdded) {
            newLines.push(`
        <div className="page-header d-flex justify-content-between align-items-center">
          <div>
            <h1 className="page-title">Top users</h1>
            <p className="page-subtitle">
              Ranked by average rating. Only {who} with at least {minReviews} reviews are listed.
            </p>
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="btn btn-outline-secondary d-md-none rounded-pill"
          >
            <i className="bi bi-funnel"></i> Filters{filtersActive ? ' •' : ''}
          </button>
        </div>`);
            headerAdded = true;
        }
    }
    
    if (lines[i].includes('<div className="d-flex align-items-start justify-content-between gap-3 mb-4">')) {
        skipMode = true;
        continue;
    }
    
    if (skipMode) {
        if (lines[i].includes('</button>')) {
            // Next line should be </div> closing the d-flex block
            skipMode = false;
            i++; // skip the closing </div>
            continue;
        }
        continue;
    }
    
    newLines.push(lines[i]);
}

fs.writeFileSync(topUsersPath, newLines.join('\n'));
console.log('Done');
