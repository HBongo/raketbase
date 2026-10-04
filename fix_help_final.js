const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/Help.jsx", "utf8");

const replacement = `  return (
    <div className="help-page">
      {/* Navbar */}
      <nav className="help-navbar">
        <div className="help-nav-content">
          <Link to={isLoggedIn ? "/dashboard" : "/"} className="help-brand">
            <img src="/raketbase-icon.svg" alt="RaketBase" onError={(e) => e.target.style.display="none"} />
            <span className="help-brand-text">
              <span className="help-brand-bold">RAKET</span><span className="help-brand-light">BASE</span>
            </span>
          </Link>
          <Link to={backLink} onClick={goBack} className="help-back-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            {backText}
          </Link>
        </div>
      </nav>

      <div className="help-container">
        <div className="help-header">
          <h1 className="help-title">Help & Support</h1>
          <p className="help-subtitle">Quick answers about hiring, working, payments, and your account.</p>
        </div>

        <div className="row g-4">
          <div className="col-12 col-lg-8">
          {SECTIONS.map((section) => (
            <div className="help-card" key={section.title}>
              <div className="help-card-header">
                <h2 className="help-card-title">{section.title}</h2>
              </div>
              <div className="help-card-body">
                {section.items.map((item, i) => (
                  <details key={item.q} className="help-accordion">
                    <summary className="help-accordion-summary">
                      {item.q}
                      <svg className="help-accordion-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </summary>
                    <div className="help-accordion-content">{item.a}</div>
                  </details>
                ))}
              </div>
            </div>
          ))}
          </div>

          <div className="col-12 col-lg-4">
            <div className="help-sidebar-box">
              <h2 className="help-sidebar-title">Still need help?</h2>
              <p className="help-sidebar-text">
                For a problem with a contract, filing a dispute from your Dashboard is the fastest way to reach an admin.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <Link to="/dashboard" className="help-btn-primary">Go to Dashboard</Link>
                {SUPPORT_EMAIL && (
                  <a href={\`mailto:\${SUPPORT_EMAIL}\`} className="help-btn-outline">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    Email Support
                  </a>
                )}
              </div>
              
              <div className="help-links">
                <Link to="/terms">Terms of Service</Link>
                <Link to="/privacy">Privacy Notice</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );`;

const startIdx = content.indexOf("  return (");
if (startIdx !== -1) {
  content = content.substring(0, startIdx) + replacement + "\n}\n";
  fs.writeFileSync("frontend/src/pages/Help.jsx", content);
  console.log("Replaced successfully.");
}
