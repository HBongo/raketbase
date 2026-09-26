import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getContractById, createDispute } from '../services/api';

const REASON_OPTIONS = ['Incomplete Work', 'Non-Payment', 'Unresponsive'];
const MIN_EVIDENCE_LENGTH = 30;

export default function DisputeTicket() {
  const { id: contractId } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [loadingContract, setLoadingContract] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [reasonCategory, setReasonCategory] = useState('');
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    async function loadContract() {
      try {
        const res = await getContractById(contractId);
        setContract(res.data);
      } catch (err) {
        setLoadError(err.message || 'Could not load this contract.');
      } finally {
        setLoadingContract(false);
      }
    }
    loadContract();
  }, [contractId]);

  const evidenceTooShort = evidenceSummary.trim().length < MIN_EVIDENCE_LENGTH;
  const evidenceCharsLeft = MIN_EVIDENCE_LENGTH - evidenceSummary.trim().length;

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    setSubmitError('');

    if (!reasonCategory) {
      return setSubmitError('Please select a reason for the dispute.');
    }
    if (evidenceTooShort) {
      return setSubmitError(`Evidence summary must be at least ${MIN_EVIDENCE_LENGTH} characters.`);
    }

    setSubmitting(true);
    try {
      await createDispute({
        contract_id: contractId,
        reason_category: reasonCategory,
        evidence_summary: evidenceSummary.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'Failed to file dispute. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const otherParty =
    user.user_id === contract?.client_id ? contract?.freelancer : contract?.client;
  const otherPartyLabel = user.user_id === contract?.client_id ? 'Freelancer' : 'Client';

  return (
    <>
      {/* Page Content Here */}
        <div className="row g-4 mb-4 justify-content-center">
          <div className="col-12 col-md-8 col-xl-6 mt-4">
            {loadingContract ? (
              <div className="d-flex flex-column align-items-center justify-content-center p-5 mt-5">
                <div className="spinner-border text-secondary mb-3" role="status">
                  <span className="visually-hidden">Loading contract details...</span>
                </div>
                <p className="text-muted">Loading contract details...</p>
              </div>
            ) : loadError ? (
              <div className="card shadow-sm text-center">
                <div className="card-body p-5">
                  <h4 className="card-title mb-3">Couldn't load this contract</h4>
                  <p className="text-muted small mb-4">{loadError}</p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="btn text-white fw-bold px-4 py-2"
                    style={{ backgroundColor: '#FF5A1E' }}
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            ) : submitted ? (
              <div className="card shadow-sm text-center">
                <div className="card-body p-5">
                  <div className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-circle mb-4" style={{ width: "60px", height: "60px", fontSize: "2rem" }}>
                    <i className="bi bi-check2"></i>
                  </div>
                  <h4 className="card-title mb-3">Dispute filed</h4>
                  <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: "300px" }}>
                    A staff admin will review the evidence and reach a resolution. You'll be able to track
                    its status from your dashboard.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="btn text-white fw-bold px-4 py-2"
                    style={{ backgroundColor: '#FF5A1E' }}
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <div className="card shadow-sm">
                <div className="card-body p-4 p-md-5">
                  <h4 className="fw-bold mb-2">File a Dispute</h4>
                  <p className="text-muted small mb-4">
                    Disputes are reviewed by RaketBase staff, who can refund the client, release funds to
                    the freelancer, or split the escrowed amount.
                  </p>

                  {/* Contract context */}
                  <div className="p-3 mb-4 bg-light border rounded-3">
                    <h6 className="fw-medium mb-1">
                      {contract?.jobs?.title || 'Contract'}
                    </h6>
                    <p className="text-muted small mb-0">
                      ₱{Number(contract?.agreed_amount || 0).toLocaleString()} in escrow
                      {otherParty && (
                        <>
                          {' · '}
                          {otherPartyLabel}: {[otherParty.first_name, otherParty.last_name].filter(Boolean).join(' ') || otherParty.email}
                        </>
                      )}
                    </p>
                  </div>

                  {submitError && (
                    <div className="alert alert-danger small py-2 mb-4 border-danger border-opacity-25 bg-danger bg-opacity-10 text-danger">
                      {submitError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                    <div>
                      <label className="form-label small fw-medium text-muted mb-1" htmlFor="reason">
                        Reason / Category
                      </label>
                      <select
                        id="reason"
                        required
                        value={reasonCategory}
                        onChange={(e) => setReasonCategory(e.target.value)}
                        className="form-select text-sm"
                      >
                        <option value="">Select a reason</option>
                        {REASON_OPTIONS.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label small fw-medium text-muted mb-1" htmlFor="evidence">
                        Evidence Summary
                      </label>
                      <textarea
                        id="evidence"
                        required
                        rows={6}
                        placeholder="Explain what happened, including relevant dates, messages, or deliverables. Minimum 30 characters."
                        value={evidenceSummary}
                        onChange={(e) => setEvidenceSummary(e.target.value)}
                        onBlur={() => setTouched(true)}
                        className="form-control text-sm"
                      />
                      <div className="d-flex justify-content-between mt-1">
                        {touched && evidenceTooShort ? (
                          <span className="text-danger" style={{ fontSize: '12px' }}>
                            {evidenceCharsLeft > 0
                              ? `${evidenceCharsLeft} more character${evidenceCharsLeft === 1 ? '' : 's'} needed`
                              : 'Evidence summary is required'}
                          </span>
                        ) : (
                          <span></span>
                        )}
                        <span className="text-muted" style={{ fontSize: '12px' }}>
                          {evidenceSummary.trim().length}/{MIN_EVIDENCE_LENGTH} min
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn text-white fw-bold py-2 mt-2 w-100"
                      style={{ backgroundColor: '#FF5A1E', opacity: submitting ? 0.7 : 1 }}
                    >
                      {submitting ? 'Filing dispute...' : 'File Dispute'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
    </>
  );
}
