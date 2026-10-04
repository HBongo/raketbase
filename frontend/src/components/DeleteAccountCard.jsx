// DeleteAccountCard.jsx — "Danger zone" at the bottom of Profile → Security.
// Deleting anonymizes the account: personal data is wiped and the login is blocked for good,
// while contracts, chats and reviews shared with other people stay as "Deleted user".
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteAccount, forceLogout } from '../services/api';

export default function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [blockers, setBlockers] = useState(null);

  function close() {
    if (deleting) return;
    setOpen(false);
    setPassword('');
    setConfirmText('');
    setError('');
    setBlockers(null);
  }

  async function handleDelete(e) {
    e.preventDefault();
    if (confirmText !== 'DELETE' || !password) return;
    setDeleting(true);
    setError('');
    setBlockers(null);
    try {
      await deleteAccount(password);
      forceLogout('deleted');
    } catch (err) {
      setError(err.message || 'Could not delete your account.');
      if (err.data?.contracts) setBlockers(err.data.contracts);
      setDeleting(false);
    }
  }

  const canSubmit = confirmText === 'DELETE' && password && !deleting;

  return (
    <>
      <div className="card shadow-sm mb-4 border border-danger">
        <div className="card-header bg-white border-bottom-0 pt-4 px-4 pb-0">
          <h5 className="fw-bold text-danger mb-0"><i className="bi bi-exclamation-octagon me-2"></i>Danger</h5>
        </div>
        <div className="card-body px-4 pb-4 mt-2">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div className="fw-medium text-dark">Delete your account</div>
              <div className="text-muted small">
                Permanently removes your personal details and logs you out for good. This can't be undone.
              </div>
            </div>
            <button type="button" className="btn btn-outline-danger rounded-pill px-4 fw-medium" onClick={() => setOpen(true)}>
              Delete account
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <form className="modal-content shadow" onSubmit={handleDelete}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger" id="delete-account-title">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>Delete your account?
                </h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={close} disabled={deleting}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger small mb-3" role="alert">
                  <strong>This is permanent and can't be undone.</strong> Not even an admin can restore your account.
                </div>

                <p className="small fw-semibold text-dark mb-1">What will be deleted</p>
                <ul className="small text-muted mb-3">
                  <li>Your name, email, photos, bios, skills, phone number, and links, on both your Freelancer and Client profiles</li>
                  <li>Your payout details and payment method</li>
                  <li>Your notifications</li>
                  <li>Your login: you'll be logged out and can never log in to this account again</li>
                </ul>

                <p className="small fw-semibold text-dark mb-1">What happens to open items</p>
                <ul className="small text-muted mb-3">
                  <li>Your open and paused job postings are cancelled, and freelancers who bid on them are told</li>
                  <li>Your pending proposals are withdrawn</li>
                  <li>Pending direct offers you sent are withdrawn, and ones you received are declined</li>
                </ul>

                <p className="small fw-semibold text-dark mb-1">What stays, shown as "Deleted user"</p>
                <ul className="small text-muted mb-3">
                  <li>Finished contracts, their chats, and ratings, so the people you worked with keep their records and earnings</li>
                </ul>

                <p className="small text-muted mb-3">
                  You can't delete your account while a contract is active, waiting for approval, or in a dispute. Finish or resolve those first.
                </p>

                {error && (
                  <div className="alert alert-warning small" role="alert">
                    {error}
                    {blockers && (
                      <ul className="mb-0 mt-2">
                        {blockers.map((c) => (
                          <li key={c.contract_id}>{c.title} <span className="text-muted">({c.status})</span></li>
                        ))}
                      </ul>
                    )}
                    {blockers && <div className="mt-2"><Link to="/dashboard">Go to your contracts</Link></div>}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label small fw-medium text-dark" htmlFor="delete-password">Your password</label>
                  <input
                    id="delete-password"
                    type="password"
                    className="form-control"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={deleting}
                  />
                </div>
                <div>
                  <label className="form-label small fw-medium text-dark" htmlFor="delete-confirm">
                    Type <strong>DELETE</strong> to confirm
                  </label>
                  <input
                    id="delete-confirm"
                    type="text"
                    className="form-control"
                    autoComplete="off"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    disabled={deleting}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={close} disabled={deleting}>
                  Keep my account
                </button>
                <button type="submit" className="btn btn-danger rounded-pill px-4 fw-medium" disabled={!canSubmit}>
                  {deleting ? <><span className="spinner-border spinner-border-sm me-2"></span>Deleting...</> : 'Permanently delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
