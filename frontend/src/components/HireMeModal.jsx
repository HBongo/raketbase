import { useState } from 'react';
import { createOffer } from '../services/api';

const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
// Same types the backend accepts (and the chat allows).
const ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip';
const HTML_RE = /<\s*[^>]*[a-zA-Z/][^>]*>|javascript\s*:/i;

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function formatSize(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Client → freelancer direct offer, opened from the "Hire Me" button on a profile.
export default function HireMeModal({ freelancerId, freelancerName, onClose, onSent }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('PHP');
  const [deadline, setDeadline] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const minAmount = currency === 'USD' ? 2 : 100;
  const problems = [];
  if (title.trim().length < 10) problems.push('Title must be at least 10 characters.');
  if (description.trim().length < 30) problems.push('Details must be at least 30 characters.');
  if (HTML_RE.test(title) || HTML_RE.test(description)) problems.push('HTML or script tags are not allowed.');
  if (!(Number(amount) >= minAmount)) problems.push(`Price must be at least ${currency === 'USD' ? '$2' : '₱100'}.`);

  function handleFiles(e) {
    setError('');
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    const next = [...files, ...picked];
    if (next.length > MAX_FILES) return setError(`You can attach up to ${MAX_FILES} files.`);
    const tooBig = picked.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) return setError(`"${tooBig.name}" is larger than 10 MB.`);
    setFiles(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (problems.length) return setError(problems[0]);
    setError('');
    setSending(true);
    try {
      await createOffer({
        freelancer_id: freelancerId,
        title: title.trim(),
        description: description.trim(),
        amount: Number(amount),
        currency,
        deadline: deadline || undefined,
        files,
      });
      onSent();
    } catch (err) {
      setError(err.message || 'Could not send the offer.');
      setSending(false);
    }
  }

  return (
    <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="hire-title" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <form className="modal-content shadow" onSubmit={handleSubmit} noValidate>
          <div className="modal-header border-bottom-0 pb-0">
            <div>
              <h5 className="modal-title fw-bold" id="hire-title">Hire {freelancerName}</h5>
              <p className="text-muted small mb-0">Send a direct offer. If they accept, it becomes a contract right away.</p>
            </div>
            <button type="button" className="btn-close" onClick={onClose} disabled={sending} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}

            <div className="mb-3">
              <label className="form-label small fw-medium" htmlFor="offer-title">Project title <span className="text-danger">*</span></label>
              <input
                id="offer-title"
                className="form-control"
                maxLength={150}
                placeholder="e.g. Landing page redesign for my bakery"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between">
                <label className="form-label small fw-medium" htmlFor="offer-description">Proposal details <span className="text-danger">*</span></label>
                <span className="small text-muted">{description.length}/2000</span>
              </div>
              <textarea
                id="offer-description"
                className="form-control"
                rows={5}
                maxLength={2000}
                placeholder="Describe the work, deliverables, and anything they should know (min. 30 characters)."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-7">
                <label className="form-label small fw-medium" htmlFor="offer-amount">Price you're offering <span className="text-danger">*</span></label>
                <div className="input-group">
                  <select
                    className="form-select flex-grow-0"
                    style={{ width: 'auto' }}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    aria-label="Currency"
                  >
                    <option value="PHP">₱ PHP</option>
                    <option value="USD">$ USD</option>
                  </select>
                  <input
                    id="offer-amount"
                    type="number"
                    min={minAmount}
                    step="0.01"
                    className="form-control"
                    placeholder={currency === 'USD' ? '100' : '5000'}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="form-text">Fixed price, held in escrow once the contract starts.</div>
              </div>
              <div className="col-12 col-md-5">
                <label className="form-label small fw-medium" htmlFor="offer-deadline">Deadline (optional)</label>
                <input
                  id="offer-deadline"
                  type="date"
                  min={tomorrow()}
                  className="form-control"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label small fw-medium" htmlFor="offer-files">Attachments (optional)</label>
              <input
                id="offer-files"
                type="file"
                multiple
                accept={ACCEPT}
                className="form-control"
                onChange={handleFiles}
                disabled={files.length >= MAX_FILES || sending}
              />
              <div className="form-text">Up to {MAX_FILES} files, 10 MB each: images, PDF, Word, Excel, PowerPoint, TXT or ZIP.</div>
              {files.length > 0 && (
                <ul className="list-unstyled mt-2 mb-0 d-flex flex-column gap-1">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="d-flex align-items-center justify-content-between border rounded px-2 py-1 small">
                      <span className="text-truncate"><i className="bi bi-paperclip me-1"></i>{f.name} <span className="text-muted">({formatSize(f.size)})</span></span>
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0 ms-2"
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={`Remove ${f.name}`}
                        disabled={sending}
                      >
                        <i className="bi bi-x-circle"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="modal-footer border-top-0 pt-0">
            <button type="button" className="btn btn-link text-muted text-decoration-none" onClick={onClose} disabled={sending}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn text-white fw-medium px-4"
              style={{ backgroundColor: '#FF5A1E', borderColor: '#FF5A1E' }}
              disabled={sending || problems.length > 0}
            >
              {sending ? 'Sending offer...' : 'Send offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
