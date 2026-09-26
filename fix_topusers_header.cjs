const fs = require('fs');
let topUsersPath = 'c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/TopUsers.jsx';
let topUsers = fs.readFileSync(topUsersPath, 'utf8');

topUsers = topUsers.replace('<div className="row g-4 px-3 mb-4">', '<div className="row g-4 mb-4">');

const badBlockRegex = /<div className="col-12 col-xl-9 col-lg-8">\s*<div className="d-flex align-items-start justify-content-between gap-3 mb-4">\s*<div>\s*<h2 className="fw-bold mb-1">Top users<\/h2>\s*<p className="text-muted small mb-0">\s*Ranked by average rating\. Only \{who\} with at least \{minReviews\} reviews are listed\.\s*<\/p>\s*<\/div>\s*<button\s*onClick=\{[^}]+\}\s*className="btn btn-outline-secondary d-md-none"\s*>\s*<i className="bi bi-funnel"><\/i> Filters\{filtersActive \? ' •' : ''\}\s*<\/button>\s*<\/div>/m;

const newBlock = `<div className="col-12 col-xl-9 col-lg-8">`;

if (badBlockRegex.test(topUsers)) {
    // Insert page header before row
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
    topUsers = topUsers.replace(badBlockRegex, newBlock);
    
    fs.writeFileSync(topUsersPath, topUsers);
} else {
    console.log("No match found for bad block");
}
