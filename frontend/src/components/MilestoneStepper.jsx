import React from 'react';
import { formatCurrency } from '../utils/formatters';

export default function MilestoneStepper({ milestones = [], currency = 'PHP', onReview, onSubmit, isClient = false }) {
  if (!milestones || milestones.length === 0) return null;

  const sortedMilestones = [...milestones].sort((a, b) => a.sequence - b.sequence);
  const totalAmount = sortedMilestones.reduce((acc, m) => acc + (Number(m.amount) || 0), 0);
  
  const completedAmount = sortedMilestones
    .filter((m) => m.status === 'completed')
    .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

  const inReviewAmount = sortedMilestones
    .filter((m) => m.status === 'submitted')
    .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

  const activeAmount = sortedMilestones
    .filter((m) => m.status === 'active')
    .reduce((acc, m) => acc + (Number(m.amount) || 0), 0);

  const completedCount = sortedMilestones.filter((m) => m.status === 'completed').length;
  const progressPercent = totalAmount > 0 ? Math.round((completedAmount / totalAmount) * 100) : 0;
  const inReviewPercent = totalAmount > 0 ? Math.round((inReviewAmount / totalAmount) * 100) : 0;

  // Check if any active milestone has a revision requested
  const revisionMilestone = sortedMilestones.find(
    (m) => m.status === 'active' && m.deliverable_notes && m.deliverable_notes.startsWith('[Revision Requested]:')
  );

  return (
    <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden bg-white text-dark">
      {/* Header & Financial Meter */}
      <div className="card-header bg-light border-bottom p-3 p-md-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge rounded-pill bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1">
                <i className="bi bi-diagram-3 me-1"></i> Stage Progress
              </span>
              <span className="small text-muted fw-medium">
                {completedCount} of {sortedMilestones.length} stages completed ({progressPercent}%)
              </span>
            </div>
          </div>
          <div className="d-flex align-items-baseline gap-3 text-end">
            <div>
              <span className="text-muted small d-block">Released</span>
              <span className="fw-bold text-success">{formatCurrency(completedAmount, currency)}</span>
            </div>
            <div className="vr my-1"></div>
            <div>
              <span className="text-muted small d-block">Total Budget</span>
              <span className="fw-bold text-dark">{formatCurrency(totalAmount, currency)}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress rounded-pill" style={{ height: '8px', backgroundColor: '#e9ecef' }}>
          <div
            className="progress-bar bg-success"
            role="progressbar"
            style={{ width: `${progressPercent}%` }}
            aria-valuenow={progressPercent}
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
          <div
            className="progress-bar bg-warning progress-bar-striped progress-bar-animated"
            role="progressbar"
            style={{ width: `${inReviewPercent}%` }}
            aria-valuenow={inReviewPercent}
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
      </div>

      {/* Revision Alert Banner if needed */}
      {revisionMilestone && (
        <div className="alert alert-warning border-0 rounded-0 mb-0 d-flex align-items-start gap-2 px-4 py-3">
          <i className="bi bi-exclamation-circle-fill text-warning fs-5 flex-shrink-0 mt-0.5"></i>
          <div className="small">
            <strong>Revision Requested on Stage {revisionMilestone.sequence} ({revisionMilestone.title}):</strong>{' '}
            <span>{revisionMilestone.deliverable_notes.replace('[Revision Requested]:', '').trim()}</span>
          </div>
        </div>
      )}

      {/* Visual Stepper Nodes */}
      <div className="card-body p-3 p-md-4">
        <div className="row g-2 g-md-3 row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5">
          {sortedMilestones.map((m, idx) => {
            const isCompleted = m.status === 'completed';
            const isSubmitted = m.status === 'submitted';
            const hasRevision = m.status === 'active' && m.deliverable_notes && m.deliverable_notes.startsWith('[Revision Requested]:');
            const isActive = m.status === 'active' && !hasRevision;
            const isPending = m.status === 'pending';

            let badgeClass = 'bg-secondary text-white';
            let statusText = 'Pending';
            let iconClass = 'bi-circle';
            let cardBorder = 'border-light-subtle';

            if (isCompleted) {
              badgeClass = 'bg-success text-white';
              statusText = 'Completed';
              iconClass = 'bi-check-lg';
              cardBorder = 'border-success-subtle bg-success bg-opacity-10';
            } else if (isSubmitted) {
              badgeClass = 'bg-warning text-dark';
              statusText = 'In Review';
              iconClass = 'bi-hourglass-split';
              cardBorder = 'border-warning-subtle bg-warning bg-opacity-10';
            } else if (hasRevision) {
              badgeClass = 'bg-danger text-white';
              statusText = 'Needs Revision';
              iconClass = 'bi-arrow-repeat';
              cardBorder = 'border-danger-subtle bg-danger bg-opacity-10';
            } else if (isActive) {
              badgeClass = 'bg-primary text-white';
              statusText = 'In Progress';
              iconClass = 'bi-play-fill';
              cardBorder = 'border-primary-subtle bg-primary bg-opacity-10';
            }

            return (
              <div key={m.milestone_id || idx} className="col">
                <div className={`p-3 rounded-3 border h-100 d-flex flex-column justify-content-between ${cardBorder}`}>
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="badge rounded-pill bg-light text-muted border px-2 py-0.5" style={{ fontSize: '0.75rem' }}>
                        Stage {m.sequence}
                      </span>
                      <span className={`badge rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1 ${badgeClass}`} style={{ fontSize: '0.72rem' }}>
                        <i className={`bi ${iconClass}`}></i> {statusText}
                      </span>
                    </div>

                    <div className="fw-semibold text-truncate small mt-2 text-dark" title={m.title}>
                      {m.title}
                    </div>

                    <div className="fw-bold text-success small mt-1">
                      {formatCurrency(m.amount, currency)}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-top border-light-subtle">
                    {isSubmitted && isClient && onReview && (
                      <button
                        type="button"
                        className="btn btn-sm btn-success w-100 rounded-pill py-1 d-flex align-items-center justify-content-center gap-1"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => onReview(m)}
                      >
                        <i className="bi bi-shield-check"></i> Review & Approve
                      </button>
                    )}

                    {(isActive || hasRevision) && !isClient && onSubmit && (
                      <button
                        type="button"
                        className={`btn btn-sm ${hasRevision ? 'btn-danger' : 'btn-primary'} w-100 rounded-pill py-1 d-flex align-items-center justify-content-center gap-1`}
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => onSubmit(m)}
                      >
                        <i className="bi bi-upload"></i> {hasRevision ? 'Resubmit Work' : 'Submit Work'}
                      </button>
                    )}

                    {isCompleted && m.deliverable_url && onReview && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary w-100 rounded-pill py-1 d-flex align-items-center justify-content-center gap-1"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => onReview(m)}
                      >
                        <i className="bi bi-box-arrow-up-right"></i> View Deliverable
                      </button>
                    )}

                    {isPending && (
                      <span className="small text-muted d-block text-center py-1 fst-italic" style={{ fontSize: '0.75rem' }}>
                        Locked until previous stage
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
