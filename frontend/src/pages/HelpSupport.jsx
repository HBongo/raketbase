import { useState } from 'react';
import { Link } from 'react-router-dom';
import { showToast } from '../utils/toast';

const FAQS = [
  {
    q: 'How does escrow protection work on RaketBase?',
    a: 'When a client hires a freelancer or accepts a milestone, the agreed funds are deposited into secure escrow. Funds are only released to the freelancer once the client reviews and approves the submitted deliverable.',
  },
  {
    q: 'How do milestone contracts work?',
    a: 'For milestone-based projects, the work is divided into sequential stages. Each stage has its own deliverables and budget. The client funds each milestone, and the freelancer works on one active stage at a time.',
  },
  {
    q: 'What should I do if there is a problem with a contract?',
    a: 'Both clients and freelancers can file a dispute ticket from the contract page or dashboard. Our support staff reviews the evidence, chat logs, and deliverables to ensure a fair resolution or split payment.',
  },
  {
    q: 'How do I switch between Client and Freelancer modes?',
    a: 'RaketBase allows one account to act as both client and freelancer. Click your avatar in the top-right navbar and select "Switch Role" anytime to switch between hiring and working.',
  },
];

export default function HelpSupport() {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const [name, setName] = useState(
    [user.first_name, user.last_name].filter(Boolean).join(' ') || ''
  );
  const [email, setEmail] = useState(user.email || '');
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('Please fill in both the subject and message.', { type: 'error' });
      return;
    }
    setSubmitting(true);
    // Simulate sending support request
    setTimeout(() => {
      setSubmitting(false);
      setSent(true);
      showToast('Support ticket sent! We will reply via email within 24 hours.', { type: 'success' });
      setSubject('');
      setMessage('');
    }, 600);
  };

  return (
    <div className="container-lg py-4">
      <div className="page-header mb-4">
        <div>
          <h1 className="page-title">Help & Support</h1>
          <p className="page-subtitle">Find answers to common questions or reach out to the RaketBase support team.</p>
        </div>
        <Link to="/dashboard" className="btn btn-outline-secondary btn-sm rounded-pill px-3">
          <i className="bi bi-arrow-left me-1"></i> Back to Dashboard
        </Link>
      </div>

      <div className="row g-4">
        {/* Support Request Form */}
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-bottom pt-4 px-4 pb-3">
              <h5 className="fw-bold mb-1">
                <i className="bi bi-envelope-paper me-2 text-primary"></i> Contact Support
              </h5>
              <p className="small text-muted mb-0">Have an issue or inquiry? Send us a ticket and we'll help you promptly.</p>
            </div>
            <div className="card-body p-4">
              {sent && (
                <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
                  <i className="bi bi-check-circle-fill me-2 fs-5"></i>
                  <div>
                    <strong>Ticket Submitted!</strong> Your request has been logged. Our support team will follow up via your email within 24 hours.
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row g-3 mb-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold">Your Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold">Your Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Inquiry Category</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="general">General Question</option>
                    <option value="escrow">Escrow & Payments</option>
                    <option value="disputes">Contract & Disputes</option>
                    <option value="account">Account & Security</option>
                    <option value="bug">Report a Bug</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Brief summary of your inquiry"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-semibold">Detailed Description</label>
                  <textarea
                    rows="5"
                    className="form-control"
                    placeholder="Please describe the issue or question in detail..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-dark fw-bold rounded-pill px-4"
                  style={{ backgroundColor: '#FF5A1E', borderColor: '#FF5A1E' }}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Sending Ticket...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-1"></i> Send Support Ticket
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Quick FAQ & Channels */}
        <div className="col-12 col-lg-5">
          <div className="d-flex flex-column gap-4">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-transparent border-bottom pt-4 px-4 pb-3">
                <h5 className="fw-bold mb-0">
                  <i className="bi bi-question-circle me-2 text-warning"></i> Frequently Asked Questions
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="d-flex flex-column gap-3">
                  {FAQS.map((faq, idx) => (
                    <div key={idx} className="border rounded p-3">
                      <button
                        type="button"
                        className="btn btn-link p-0 text-start text-decoration-none fw-semibold w-100 d-flex justify-content-between align-items-center"
                        style={{ color: 'inherit' }}
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      >
                        <span className="small">{faq.q}</span>
                        <i className={`bi bi-chevron-${openFaq === idx ? 'up' : 'down'} text-muted ms-2`}></i>
                      </button>
                      {openFaq === idx && (
                        <p className="small text-muted mt-2 mb-0 border-top pt-2">
                          {faq.a}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-2">Direct Contact</h6>
                <p className="small text-muted mb-3">You can also reach our administrative staff directly via email:</p>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-envelope text-primary"></i>
                  <a href="mailto:support@raketbase.com" className="small fw-semibold text-decoration-none">
                    support@raketbase.com
                  </a>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-clock text-muted"></i>
                  <span className="small text-muted">Average response time: &lt; 24 hours</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
