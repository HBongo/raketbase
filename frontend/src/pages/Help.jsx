import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/help.css';
const SUPPORT_EMAIL = 'rjsdelagua@mymail.mapua.edu.ph';

const SECTIONS = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'What are Client mode and Freelancer mode?',
        a: 'Every account can both hire and work. Client mode is for posting jobs and hiring; Freelancer mode is for finding work and sending proposals. Switch any time with the mode toggle. Your profile has a separate Client side and Freelancer side, each with its own photo and bio.',
      },
      {
        q: 'How do I find people to hire or work with?',
        a: 'Browse Users lists freelancers and clients with their ratings, average prices, and latest reviews. Its "Top users" view shows the highest-rated people.',
      },
    ],
  },
  {
    title: 'Hiring (Client mode)',
    items: [
      {
        q: 'How do I post a job?',
        a: 'Switch to Client mode and click "Post a Job". Choose Fixed Price for one payment, or Milestone Based if the work should be paid in stages. You can edit, pause, resume, or cancel a posting from My Postings.',
      },
      {
        q: 'How do I hire a specific freelancer?',
        a: 'Open their profile and click "Hire Me" to send a direct offer with your price, details, and optional files. Track it under My Postings → Sent offers.',
      },
      {
        q: 'What happens when I accept a proposal?',
        a: 'A contract is created, the agreed amount is held in escrow, and a chat with the freelancer opens. You can message them from the accepted proposal or your Dashboard.',
      },
    ],
  },
  {
    title: 'Working (Freelancer mode)',
    items: [
      {
        q: 'How do I apply for a job?',
        a: 'Open a job from Explore and fill in the proposal form with your bid and cover letter. For milestone jobs, split your bid into stages. Track your proposals and direct offers under My Proposals.',
      },
      {
        q: 'How do I get paid?',
        a: 'Submit your work from the Dashboard. When the client approves it, the escrowed amount is released to you. On milestone contracts, each stage is submitted and released separately.',
      },
    ],
  },
  {
    title: 'Contracts, chats and ratings',
    items: [
      {
        q: 'Where do I message the other person?',
        a: "Every contract has its own chat. Use the Message button on the contract in your Dashboard or open Messages. Contract chats become read-only once the contract is finished. You can also message someone before hiring: in Client mode, use Message on a freelancer's profile; in Freelancer mode, use Message on a client's profile. Either of you can ask to delete those chats at any time.",
      },
      {
        q: 'Something went wrong with a contract. What do I do?',
        a: 'Click "Dispute" on the contract in your Dashboard and explain what happened. An admin reviews it and either releases the payment, splits it, or refunds the client. Both of you are notified of the outcome.',
      },
      {
        q: 'When can I leave a rating?',
        a: 'Once a contract is completed (or a dispute about it is resolved), both sides can rate each other from the Dashboard. Ratings appear on the matching side of each person\'s profile.',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        q: 'I forgot my password.',
        a: 'Click "Forgot password?" on the login page and we\'ll email you a reset link. If you\'re logged in, change your password under Profile → Security.',
      },
      {
        q: 'Why are amounts shown with "≈"?',
        a: 'You picked a display currency other than the one the job was posted in, so the amount is converted for reference. Hover over it to see the original amount.',
      },
      {
        q: 'My account was suspended.',
        a: 'Suspended accounts can\'t log in or use the site. If you think this is a mistake, contact the RaketBase team.',
      },
    ],
  },
];

export default function Help() {
  const location = useLocation();
  const navigate = useNavigate();

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    if (isDarkMode) {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      localStorage.setItem('theme', 'light');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  const isLoggedIn = !!localStorage.getItem('token');
  const backLink = isLoggedIn ? '/dashboard' : '/';
  const backText = isLoggedIn ? 'Back to RaketBase' : 'Back to Home';
  
  const goBack = (e) => {
    if (window.history.length > 1) {
      e.preventDefault();
      navigate(-1);
    }
  };

  return (
    <div className={`help-page ${isDarkMode ? 'help-page--dark' : ''}`}>
      {/* Navbar */}
      <nav className="help-navbar">
        <div className="help-nav-content">
          <Link to={isLoggedIn ? "/dashboard" : "/"} className="help-brand">
            <img src="/raketbase-icon.svg" alt="RaketBase" onError={(e) => e.target.style.display="none"} />
            <span className="help-brand-text">
              <span className="help-brand-bold">RAKET</span><span className="help-brand-light">BASE</span>
            </span>
          </Link>
          <div className="help-nav-right">
            <button 
              className="help-theme-toggle" 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              aria-label="Toggle dark mode"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              )}
            </button>
            <Link to={backLink} onClick={goBack} className="help-back-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              {backText}
            </Link>
          </div>
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
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="help-btn-outline">
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
  );
}
