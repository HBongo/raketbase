// Help.jsx — Help & Support: short answers to the questions people ask most.
import { Link } from 'react-router-dom';

// Set this to the team's support inbox to show an email link at the bottom of the page.
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
        a: 'Every contract has its own chat. Use the Message button on the contract in your Dashboard or open Messages. Chats become read-only once the contract is finished.',
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
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Help & Support</h1>
          <p className="page-subtitle">Quick answers about hiring, working, payments, and your account.</p>
        </div>
      </div>

      <div className="row g-4 px-3 mb-4">
        <div className="col-12 col-lg-8">
          {SECTIONS.map((section) => (
            <div className="card shadow-sm border-0 mb-4" key={section.title}>
              <div className="card-body p-4">
                <h2 className="h5 fw-bold text-dark mb-3">{section.title}</h2>
                {section.items.map((item, i) => (
                  <details key={item.q} className={i > 0 ? 'border-top pt-3 mt-3' : ''}>
                    <summary className="fw-medium text-dark" style={{ cursor: 'pointer' }}>{item.q}</summary>
                    <p className="text-muted small mt-2 mb-0" style={{ lineHeight: 1.7 }}>{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="col-12 col-lg-4">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h6 fw-bold text-dark mb-3">Still need help?</h2>
              <p className="text-muted small mb-3">
                For a problem with a contract, filing a dispute from your Dashboard is the fastest way to reach an admin.
              </p>
              <div className="d-grid gap-2">
                <Link to="/dashboard" className="btn btn-dark rounded-pill fw-medium">Go to Dashboard</Link>
                {SUPPORT_EMAIL && (
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-outline-dark rounded-pill fw-medium">
                    <i className="bi bi-envelope me-2"></i>Email support
                  </a>
                )}
              </div>
              <hr className="my-4" />
              <div className="d-flex gap-3 small">
                <Link to="/terms" className="text-decoration-none">Terms of Service</Link>
                <Link to="/privacy" className="text-decoration-none">Privacy Notice</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
