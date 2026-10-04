// ClientProfileView.jsx — The Client side of a profile: how this person hires.
// Uses the client photo, company name and client bio (separate from the freelancer side),
// client stats, and the reviews freelancers left about them as a client.
import ProfileReviews from './ProfileReviews';
import Money from './Money';

const DEFAULT_AVATAR = '/default-avatar.png';

const CLIENT_TYPES = {
  individual: 'Individual',
  small_business: 'Small Business',
  major_contractor: 'Major Contractor',
};
const CLIENT_BIO_MAX = 500;
const COMPANY_MAX = 100;

export default function ClientProfileView({
  profile: f,
  form,
  editing,
  onChange,
  onStartEdit,
  isOwnProfile,
  activeTab,
  setActiveTab,
  avatarControl,
  securityTab,
  activityTab,
  paymentsTab,
}) {
  const client = f.client || {};
  const displayName = `${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Unnamed User';
  const avatarUrl = f.client_avatar_url || f.avatar_url || DEFAULT_AVATAR;
  const memberSince = f.created_at
    ? new Date(f.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const tabs = [
    { id: 'about', label: 'About', icon: 'bi-person' },
    { id: 'reviews', label: `Reviews${client.rating_count ? ` (${client.rating_count})` : ''}`, icon: 'bi-star' },
    ...(isOwnProfile ? [
      { id: 'activity', label: 'Activity', icon: 'bi-clock-history' },
      { id: 'payments', label: 'Payments', icon: 'bi-credit-card' },
      { id: 'security', label: 'Security', icon: 'bi-shield-lock' },
    ] : []),
  ];
  const tab = tabs.some((t) => t.id === activeTab) ? activeTab : 'about';

  return (
    <div className="row g-4 mb-4">
      {/* ── Left Column ───────────────────────────────────────── */}
      <div className="col-12 col-md-4">
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body text-center p-4">
            <div className="position-relative d-inline-block mb-3">
              <img
                src={avatarUrl}
                alt={displayName}
                className="rounded-circle border border-3 border-light shadow-sm"
                style={{ width: '140px', height: '140px', objectFit: 'cover' }}
              />
              {avatarControl}
            </div>

            {editing ? (
              <div className="text-start mb-3">
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small fw-medium">First Name</label>
                    <input type="text" className="form-control bg-light" value={form.first_name} onChange={(e) => onChange('first_name', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-medium">Last Name</label>
                    <input type="text" className="form-control bg-light" value={form.last_name} onChange={(e) => onChange('last_name', e.target.value)} />
                  </div>
                </div>
                <label className="form-label small fw-medium" htmlFor="client-type">Hiring as</label>
                <select id="client-type" className="form-select bg-light mb-2" value={form.client_type} onChange={(e) => onChange('client_type', e.target.value)}>
                  <option value="">Choose...</option>
                  {Object.entries(CLIENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <label className="form-label small fw-medium" htmlFor="client-company">
                  Business name {form.client_type === 'individual' || !form.client_type ? <span className="text-muted fw-normal">(optional)</span> : null}
                </label>
                <input id="client-company" type="text" className="form-control bg-light" placeholder="e.g. Acme Studio" maxLength={COMPANY_MAX} value={form.company_name} onChange={(e) => onChange('company_name', e.target.value)} />
                <div className="form-text">Your name is shared by both sides of your profile.</div>
              </div>
            ) : (
              <>
                <h4 className="fw-bold text-dark mb-1">{displayName}</h4>
                <p className="text-muted mb-2">
                  {f.company_name ? <><i className="bi bi-building me-1"></i>{f.company_name}</> : 'Client'}
                </p>
                {CLIENT_TYPES[f.client_type] && (
                  <span className="badge rounded-pill bg-light text-dark border fw-medium px-3 py-2 mb-2">{CLIENT_TYPES[f.client_type]}</span>
                )}
              </>
            )}

            {f.location && !editing && (
              <p className="text-muted small mb-3"><i className="bi bi-geo-alt-fill me-1"></i>{f.location}</p>
            )}

            {/* Stats Row */}
            <div className="row text-center mb-3 g-2">
              <div className="col-4">
                <div className="bg-light rounded-3 p-2">
                  <div className="fw-bold text-dark fs-5">{client.jobs_posted || 0}</div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>Jobs Posted</div>
                </div>
              </div>
              <div className="col-4">
                <div className="bg-light rounded-3 p-2">
                  <div className="fw-bold text-dark fs-5">{client.hires || 0}</div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>Hires</div>
                </div>
              </div>
              <div className="col-4">
                <div className="bg-light rounded-3 p-2">
                  <div className="fw-bold text-dark fs-5 d-flex align-items-center justify-content-center gap-1">
                    <i className="bi bi-star-fill text-warning" style={{ fontSize: '0.85rem' }}></i>
                    {client.rating != null ? client.rating : '—'}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                    {client.rating_count ? `Rating (${client.rating_count})` : 'No reviews'}
                  </div>
                </div>
              </div>
            </div>

            <hr className="my-3" />

            <div className="text-start small">
              <div className="d-flex align-items-center mb-2">
                <i className="bi bi-cash-stack text-muted me-3" style={{ width: '18px' }}></i>
                <span className="text-dark">
                  Avg budget:{' '}
                  {client.avg_budget != null
                    ? <span className="fw-bold text-success"><Money amount={client.avg_budget} currency="PHP" /></span>
                    : <span className="text-muted">no completed contracts yet</span>}
                </span>
              </div>
              {memberSince && (
                <div className="d-flex align-items-center">
                  <i className="bi bi-calendar3 text-muted me-3" style={{ width: '18px' }}></i>
                  <span className="text-dark">Member since {memberSince}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Column ──────────────────────────────────────── */}
      <div className="col-12 col-md-8">
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body p-0">
            <ul className="nav nav-pills p-3 gap-2 justify-content-center flex-wrap" role="tablist">
              {tabs.map((t) => (
                <li className="nav-item" key={t.id}>
                  <button
                    className={`nav-link rounded-pill px-4 fw-medium ${tab === t.id ? 'active text-white' : 'text-dark'}`}
                    style={tab === t.id ? { backgroundColor: '#072F1F' } : {}}
                    onClick={() => setActiveTab(t.id)}
                  >
                    <i className={`bi ${t.icon} me-2`}></i>{t.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {tab === 'about' && (
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white border-bottom-0 pt-4 px-4 pb-0">
              <h5 className="fw-bold text-dark mb-0"><i className="bi bi-person-badge me-2 text-muted"></i>About this Client</h5>
            </div>
            <div className="card-body px-4 pb-4">
              {editing ? (
                <>
                  <textarea
                    className="form-control bg-light"
                    rows="6"
                    maxLength={CLIENT_BIO_MAX}
                    placeholder="Tell freelancers about you or your business and the kind of work you hire for..."
                    value={form.client_bio}
                    onChange={(e) => onChange('client_bio', e.target.value)}
                  />
                  <div className="form-text text-end">{(form.client_bio || '').length}/{CLIENT_BIO_MAX}</div>
                </>
              ) : f.client_bio ? (
                f.client_bio.split('\n\n').map((p, i) => (
                  <p key={i} className="text-muted" style={{ lineHeight: '1.8', fontSize: '0.95rem', whiteSpace: 'pre-line' }}>{p}</p>
                ))
              ) : (
                <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3 text-muted">
                  <div className="d-flex align-items-center gap-2 small">
                    <i className="bi bi-card-text text-muted fs-5"></i>
                    <span>No client bio yet.{isOwnProfile ? ' Tell freelancers about you and the work you hire for.' : ''}</span>
                  </div>
                  {isOwnProfile && (
                    <button type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3" onClick={onStartEdit}>
                      <i className="bi bi-pencil me-1"></i> Add Bio
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'reviews' && (
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white border-bottom-0 pt-4 px-4 pb-0">
              <h5 className="fw-bold text-dark mb-0"><i className="bi bi-star me-2 text-muted"></i>Reviews from Freelancers</h5>
            </div>
            <div className="card-body px-4 pb-4">
              <ProfileReviews userId={f.user_id} role="customer" />
            </div>
          </div>
        )}

        {tab === 'activity' && activityTab}

        {tab === 'payments' && paymentsTab}

        {tab === 'security' && securityTab}
      </div>
    </div>
  );
}
