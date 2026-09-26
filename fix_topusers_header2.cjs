const fs = require('fs');
let topUsersPath = 'c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/TopUsers.jsx';
let topUsers = fs.readFileSync(topUsersPath, 'utf8');

topUsers = topUsers.replace('<div className="row g-4 px-3 mb-4">', '<div className="row g-4 mb-4">');

const startIdx = topUsers.indexOf('<div className="d-flex align-items-start justify-content-between gap-3 mb-4">');
if (startIdx !== -1) {
    const endStr = '</div>';
    let count = 0;
    let i = startIdx;
    let foundEnd = -1;
    
    while (i < topUsers.length) {
        if (topUsers.substring(i, i + 4) === '<div') count++;
        if (topUsers.substring(i, i + 6) === '</div') {
            count--;
            if (count === 0) {
                foundEnd = i + 6;
                break;
            }
        }
        i++;
    }

    if (foundEnd !== -1) {
        topUsers = topUsers.substring(0, startIdx) + topUsers.substring(foundEnd + 1); // remove the block
        
        const pageHeader = `
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
        </div>

        <div className="row g-4 mb-4">`;
        
        topUsers = topUsers.replace(/<div className="row g-4 mb-4">/, pageHeader);
        fs.writeFileSync(topUsersPath, topUsers);
        console.log('Replaced successfully');
    }
}
