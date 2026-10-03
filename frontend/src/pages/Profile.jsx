// FreelancerProfileView.jsx — Dynamic Freelancer Profile with Edit Mode
// Features:
// 1. Fetches real profile data from /api/v1/users/:id
// 2. Edit mode for own profile (inline toggle)
// 3. Avatar upload via Supabase Storage
// 4. Add/remove experience & education entries
// 5. Spark Admin layout (sidebar + navbar)
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFreelancerProfile, updateProfile } from '../services/api';
import { getCached, setCached } from '../utils/cache';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%232CC56F' /%3E%3Ccircle cx='50' cy='38' r='18' fill='%23FFFFFF' /%3E%3Cpath d='M 15 95 C 15 65 85 65 85 95 Z' fill='%23FFFFFF' /%3E%3C/svg%3E";

function buildFormFromProfile(p) {
  if (!p) return {};
  return {
    first_name: p.first_name || '',
    last_name: p.last_name || '',
    title: p.title || '',
    phone: p.phone || '',
    location: p.location || '',
    hourly_rate: p.hourly_rate || '',
    bio: p.bio || '',
    skills: Array.isArray(p.skills) ? p.skills.join(', ') : (p.skills || ''),
    linkedin_url: p.linkedin_url || '',
    github_url: p.github_url || '',
    website_url: p.website_url || '',
    experience: Array.isArray(p.experience) ? p.experience : [],
    education: Array.isArray(p.education) ? p.education : [],
  };
}

function ProfileSkeleton() {
  return (
    <div className="row g-4 px-3 mb-4">
      {/* Left Column Skeleton */}
      <div className="col-12 col-md-4">
        <div className="card shadow-sm border-0 mb-4 p-4 text-center bg-white">
          <div className="skeleton-box rounded-circle mx-auto mb-3" style={{ width: 140, height: 140 }} />
          <div className="skeleton-box mx-auto mb-2" style={{ width: "60%", height: 22 }} />
          <div className="skeleton-box mx-auto mb-3" style={{ width: "40%", height: 14 }} />
          <div className="skeleton-box mx-auto mb-4" style={{ width: "80%", height: 12 }} />
          <div className="d-flex justify-content-center gap-2">
            <div className="skeleton-box rounded-pill" style={{ width: 100, height: 36 }} />
          </div>
        </div>
      </div>
      {/* Right Column Skeleton */}
      <div className="col-12 col-md-8">
        <div className="card shadow-sm border-0 mb-4 p-4 bg-white">
          <div className="skeleton-box mb-4" style={{ width: "30%", height: 20 }} />
          <div className="skeleton-box mb-2" style={{ width: "100%", height: 14 }} />
          <div className="skeleton-box mb-2" style={{ width: "95%", height: 14 }} />
          <div className="skeleton-box mb-4" style={{ width: "70%", height: 14 }} />
          <div className="skeleton-box mb-3" style={{ width: "25%", height: 18 }} />
          <div className="d-flex flex-wrap gap-2 mb-4">
            <div className="skeleton-box rounded-pill" style={{ width: 80, height: 28 }} />
            <div className="skeleton-box rounded-pill" style={{ width: 100, height: 28 }} />
            <div className="skeleton-box rounded-pill" style={{ width: 70, height: 28 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { id } = useParams();
  const fileInputRef = useRef(null);

  const cachedProfile = getCached(`profile_${id}`);

  const [profile, setProfile] = useState(cachedProfile || null);
  const [loading, setLoading] = useState(!cachedProfile);
  const [loadError, setLoadError] = useState(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(cachedProfile ? buildFormFromProfile(cachedProfile) : {});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  // Current logged-in user
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  })();

  const isOwnProfile = (user.user_id || user.id) === id;

  // Load profile data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cached = getCached(`profile_${id}`);
      if (!cached) {
        setLoading(true);
      }
      setLoadError(null);
      try {
        const res = await getFreelancerProfile(id);
        if (!cancelled && res.success) {
          setProfile(res.data);
          setForm(buildFormFromProfile(res.data));
          setCached(`profile_${id}`, res.data);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);



  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // Experience helpers
  function addExperience() {
    setForm(prev => ({
      ...prev,
      experience: [...prev.experience, { jobTitle: '', company: '', startDate: '', endDate: '', description: '' }],
    }));
  }
  function updateExperience(index, field, value) {
    setForm(prev => {
      const updated = [...prev.experience];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, experience: updated };
    });
  }
  function removeExperience(index) {
    setForm(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  }

  // Education helpers
  function addEducation() {
    setForm(prev => ({
      ...prev,
      education: [...prev.education, { degree: '', institution: '', year: '' }],
    }));
  }
  function updateEducation(index, field, value) {
    setForm(prev => {
      const updated = [...prev.education];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education: updated };
    });
  }
  function removeEducation(index) {
    setForm(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  }

  // Avatar upload via backend proxy to bypass RLS
  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setSaveMsg({ type: 'error', text: 'Image must be under 5MB.' });
      return;
    }

    setUploading(true);
    setSaveMsg(null);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      
      // Convert file to base64 string
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result;
          
          // Send to backend
          await updateProfile({
            avatar_base64: base64String,
            avatar_ext: ext
          });

          // Refresh the profile page data
          const refreshed = await getFreelancerProfile(id);
          if (refreshed.success) {
            setProfile(refreshed.data);
            setForm(buildFormFromProfile(refreshed.data));
            
            // Also update localStorage user info to show avatar in navbar
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({
              ...storedUser,
              avatar_url: refreshed.data.avatar_url
            }));
            
            // Force reload window to update navbar instantly without React context
            window.location.reload();
          }
        } catch (err) {
          console.error('Avatar upload error:', err);
          setSaveMsg({ type: 'error', text: err.message || 'Failed to upload avatar.' });
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File read error:', err);
      setSaveMsg({ type: 'error', text: 'Error reading file.' });
      setUploading(false);
    }
  }

  // Save profile
  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        title: form.title,
        phone: form.phone,
        location: form.location,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
        bio: form.bio,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        linkedin_url: form.linkedin_url,
        github_url: form.github_url,
        website_url: form.website_url,
        experience: form.experience,
        education: form.education,
      };

      await updateProfile(payload);
      // Refresh profile data
      const refreshed = await getFreelancerProfile(id);
      if (refreshed.success) {
        setProfile(refreshed.data);
        setForm(buildFormFromProfile(refreshed.data));
      }
      // Also update localStorage user info
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...storedUser,
        first_name: payload.first_name,
        last_name: payload.last_name,
      }));

      setSaveMsg({ type: 'success', text: 'Profile saved successfully!' });
      setEditing(false);
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (profile) setForm(buildFormFromProfile(profile));
    setEditing(false);
    setSaveMsg(null);
  }

  // ── Derived display values ──
  const f = profile || {};
  const displayName = `${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Unnamed User';
  const avatarUrl = f.avatar_url || DEFAULT_AVATAR;
  const skillsArray = Array.isArray(f.skills) ? f.skills : (f.skills ? String(f.skills).split(',').map(s => s.trim()) : []);
  const experienceArr = Array.isArray(f.experience) ? f.experience : [];
  const educationArr = Array.isArray(f.education) ? f.education : [];



  return (
    <>
      {loading && (
        <div className="loading-bar-container" style={{ position: "sticky", top: 0, zIndex: 100, margin: "-1rem -1rem 1rem -1rem" }}>
          <div className="loading-bar-indeterminate" />
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Freelancer Profile</h1>
          <p className="page-subtitle">View skills, experience, and portfolio details.</p>
        </div>
        {isOwnProfile && !editing && (
          <button className="btn btn-dark rounded-pill px-4 fw-medium" onClick={() => setEditing(true)}>
            <i className="bi bi-pencil-square me-2"></i>Edit Profile
          </button>
        )}
        {editing && (
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary rounded-pill px-4 fw-medium" onClick={cancelEdit} disabled={saving}>Cancel</button>
            <button className="btn btn-success rounded-pill px-4 fw-medium text-white" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save Profile</>}
            </button>
          </div>
        )}
      </div>

      {/* Save / Error Messages */}
      {saveMsg && (
        <div className={`alert ${saveMsg.type === 'success' ? 'alert-success' : 'alert-danger'} mx-3 alert-dismissible fade show`} role="alert">
          <i className={`bi ${saveMsg.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2`}></i>
          {saveMsg.text}
          <button type="button" className="btn-close" onClick={() => setSaveMsg(null)}></button>
        </div>
      )}

      {/* Loading / Error States */}
      {loading && <ProfileSkeleton />}

        {!loading && loadError && (
          <div className="card text-center py-5 border">
            <div className="card-body">
              <h5 className="fw-medium text-dark">Couldn't load this profile</h5>
              <p className="text-muted">{loadError}</p>
              <button className="btn btn-outline-dark rounded-pill px-4 mt-2" onClick={() => window.location.reload()}>Try again</button>
            </div>
          </div>
        )}

        {/* ── Profile Layout ───────────────────────────────────────── */}
        {!loading && !loadError && profile && (
          <div className="row g-4 mb-4">

            {/* ── Left Column ───────────────────────────────────────── */}
            <div className="col-12 col-md-4">
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body text-center p-4">
                  {/* Avatar */}
                  <div className="position-relative d-inline-block mb-3">
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="rounded-circle border border-3 border-light shadow-sm"
                      style={{ width: '140px', height: '140px', objectFit: 'cover' }}
                    />
                    {isOwnProfile && (
                      <>
                        <input type="file" ref={fileInputRef} className="d-none" accept=".jpg,.jpeg,.png" onChange={handleAvatarUpload} />
                        <button
                          className="btn btn-dark btn-sm rounded-circle position-absolute bottom-0 end-0 d-flex align-items-center justify-content-center"
                          style={{ width: '36px', height: '36px' }}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          title="Change photo"
                        >
                          {uploading ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-camera-fill"></i>}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Name & Title */}
                  {editing ? (
                    <div className="text-start mb-3">
                      <div className="row g-2 mb-2">
                        <div className="col-6">
                          <label className="form-label small fw-medium">First Name</label>
                          <input type="text" className="form-control bg-light" value={form.first_name} onChange={(e) => handleChange('first_name', e.target.value)} />
                        </div>
                        <div className="col-6">
                          <label className="form-label small fw-medium">Last Name</label>
                          <input type="text" className="form-control bg-light" value={form.last_name} onChange={(e) => handleChange('last_name', e.target.value)} />
                        </div>
                      </div>
                      <label className="form-label small fw-medium">Professional Title</label>
                      <input type="text" className="form-control bg-light" placeholder="e.g. Full Stack Developer" maxLength="50" value={form.title} onChange={(e) => { const v = e.target.value.replace(/[^A-Za-z0-9 ]/g, ""); handleChange("title", v); }} />
                    </div>
                  ) : (
                    <>
                      <h4 className="fw-bold text-dark mb-1">{displayName}</h4>
                      <p className="text-muted mb-2">{f.title || 'No title set'}</p>
                    </>
                  )}

                  {/* Location */}
                  {editing ? (
                    <div className="text-start mb-3">
                      <label className="form-label small fw-medium">Location</label>
                      <select className="form-select bg-light" value={form.location} onChange={(e) => handleChange('location', e.target.value)}>
    <option value="">Select a region...</option>
    <option value="Metro Manila">Metro Manila</option>
    <option value="Cebu">Cebu</option>
    <option value="Davao">Davao</option>
    <option value="Other">Other</option>
  </select>
                    </div>
                  ) : (
                    f.location && <p className="text-muted small mb-3"><i className="bi bi-geo-alt-fill me-1"></i>{f.location}</p>
                  )}

                  {/* Stats Row */}
                  <div className="row text-center mb-3 g-2">
                    <div className="col-4">
                      <div className="bg-light rounded-3 p-2">
                        <div className="fw-bold text-dark fs-5">{f.completed_jobs || 0}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>Jobs Done</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="bg-light rounded-3 p-2">
                        <div className="fw-bold text-dark fs-5 d-flex align-items-center justify-content-center gap-1">
                          <i className="bi bi-star-fill text-warning" style={{ fontSize: '0.85rem' }}></i>
                          {f.rating || '—'}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>Rating</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="bg-light rounded-3 p-2">
                        {editing ? (
                          <input type="number" className="form-control form-control-sm bg-white text-center fw-bold" value={form.hourly_rate} onChange={(e) => handleChange('hourly_rate', e.target.value)} placeholder="0" />
                        ) : (
                          <div className="fw-bold text-success fs-6">₱{f.hourly_rate ? Number(f.hourly_rate).toLocaleString() : '—'}</div>
                        )}
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>/hour</div>
                      </div>
                    </div>
                  </div>

                  <hr className="my-3" />

                  {/* Contact Info */}
                  <div className="text-start">
                    <h6 className="fw-bold text-dark mb-3"><i className="bi bi-person-lines-fill me-2 text-muted"></i>Contact Info</h6>
                    {editing ? (
                      <div className="mb-3">
                        <label className="form-label small fw-medium">Phone</label>
                        <input type="text" className="form-control bg-light" placeholder="+63 917 123 4567" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                      </div>
                    ) : (
                      <>
                        {f.phone && (
                          <div className="d-flex align-items-center mb-2">
                            <i className="bi bi-telephone-fill text-muted me-3" style={{ width: '18px' }}></i>
                            <span className="small text-dark">{f.phone}</span>
                          </div>
                        )}
                        <div className="d-flex align-items-center mb-3">
                          <i className="bi bi-envelope-fill text-muted me-3" style={{ width: '18px' }}></i>
                          <span className="small text-dark">{f.email}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <hr className="my-3" />

                  {/* Social Links */}
                  <div className="text-start">
                    <h6 className="fw-bold text-dark mb-3"><i className="bi bi-link-45deg me-2 text-muted"></i>Social Links</h6>
                    {editing ? (
                      <div className="d-flex flex-column gap-2 mb-3">
                        <div className="input-group input-group-sm">
                          <span className="input-group-text bg-light"><i className="bi bi-linkedin text-primary"></i></span>
                          <input type="url" className="form-control bg-light" placeholder="LinkedIn URL" value={form.linkedin_url} onChange={(e) => handleChange('linkedin_url', e.target.value)} />
                        </div>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text bg-light"><i className="bi bi-github text-dark"></i></span>
                          <input type="url" className="form-control bg-light" placeholder="GitHub URL" value={form.github_url} onChange={(e) => handleChange('github_url', e.target.value)} />
                        </div>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text bg-light"><i className="bi bi-globe2" style={{ color: '#FF5A1E' }}></i></span>
                          <input type="url" className="form-control bg-light" placeholder="Website URL" value={form.website_url} onChange={(e) => handleChange('website_url', e.target.value)} />
                        </div>
                      </div>
                    ) : (
                      <div className="d-flex gap-3 justify-content-start">
                        {f.linkedin_url && (
                          <a href={f.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }} title="LinkedIn">
                            <i className="bi bi-linkedin text-primary fs-5"></i>
                          </a>
                        )}
                        {f.github_url && (
                          <a href={f.github_url} target="_blank" rel="noopener noreferrer" className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }} title="GitHub">
                            <i className="bi bi-github text-dark fs-5"></i>
                          </a>
                        )}
                        {f.website_url && (
                          <a href={f.website_url} target="_blank" rel="noopener noreferrer" className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }} title="Website">
                            <i className="bi bi-globe2 fs-5" style={{ color: '#FF5A1E' }}></i>
                          </a>
                        )}
                        {!f.linkedin_url && !f.github_url && !f.website_url && (
                          <span className="text-muted small">No social links added yet.</span>
                        )}
                      </div>
                    )}
                  </div>

                  {!isOwnProfile && (
                    <>
                      <hr className="my-3" />
                      <div className="d-grid gap-2">
                        <button className="btn btn-dark rounded-pill fw-medium py-2"><i className="bi bi-briefcase me-2"></i>Hire Me</button>
                        <button className="btn btn-outline-dark rounded-pill fw-medium py-2"><i className="bi bi-chat-dots me-2"></i>Message</button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Skills Card */}
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h6 className="fw-bold text-dark mb-3"><i className="bi bi-tools me-2 text-muted"></i>Skills</h6>
                  {editing ? (
                    <div>
                      <input type="text" className="form-control bg-light" placeholder="React, Node.js, TypeScript (comma separated)" value={form.skills} onChange={(e) => handleChange('skills', e.target.value)} />
                      <div className="form-text">Separate skills with commas.</div>
                    </div>
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {skillsArray.length > 0 ? (
                        skillsArray.map((skill) => (
                          <span key={skill} className="badge bg-light text-dark border fw-medium px-3 py-2 rounded-pill" style={{ fontSize: '0.8rem' }}>{skill}</span>
                        ))
                      ) : (
                        <div className="d-flex align-items-center justify-content-between p-2 bg-light rounded-3 text-muted small w-100">
                          <span><i className="bi bi-tag me-1"></i>No skills added yet.</span>
                          {isOwnProfile && (
                            <button type="button" className="btn btn-sm btn-link p-0 text-decoration-none fw-semibold" onClick={() => setEditing(true)}>
                              + Add Skills
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right Column ──────────────────────────────────────── */}
            <div className="col-12 col-md-8">
              {/* Tab Navigation */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-0">
                  <ul className="nav nav-pills p-3 gap-2 justify-content-center flex-wrap" role="tablist">
                    {[
                      { id: 'about', label: 'About Me', icon: 'bi-person' },
                      { id: 'experience', label: 'Experience', icon: 'bi-building' },
                      { id: 'education', label: 'Education', icon: 'bi-mortarboard' },
                    ].map((tab) => (
                      <li className="nav-item" key={tab.id}>
                        <button
                          className={`nav-link rounded-pill px-4 fw-medium ${activeTab === tab.id ? 'active text-white' : 'text-dark'}`}
                          style={activeTab === tab.id ? { backgroundColor: '#072F1F' } : {}}
                          onClick={() => setActiveTab(tab.id)}
                        >
                          <i className={`bi ${tab.icon} me-2`}></i>{tab.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* ── About Me Tab ──────────────────────────────────── */}
              {activeTab === 'about' && (
                <div className="card shadow-sm border-0 mb-4">
                  <div className="card-header bg-white border-bottom-0 pt-4 px-4 pb-0">
                    <h5 className="fw-bold text-dark mb-0"><i className="bi bi-person-badge me-2 text-muted"></i>About Me</h5>
                  </div>
                  <div className="card-body px-4 pb-4">
                    {editing ? (
                      <textarea className="form-control bg-light" rows="8" placeholder="Tell clients about yourself, your experience, and what makes you unique..." value={form.bio} onChange={(e) => handleChange('bio', e.target.value)} />
                    ) : (
                      f.bio ? (
                        f.bio.split('\n\n').map((p, i) => (
                          <p key={i} className="text-muted" style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>{p}</p>
                        ))
                      ) : (
                        <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3 text-muted">
                          <div className="d-flex align-items-center gap-2 small">
                            <i className="bi bi-card-text text-muted fs-5"></i>
                            <span>No bio added yet. Tell clients about your experience and services.</span>
                          </div>
                          {isOwnProfile && (
                            <button type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3" onClick={() => setEditing(true)}>
                              <i className="bi bi-pencil me-1"></i> Add Bio
                            </button>
                          )}
                        </div>
                      )
                    )}
                    {!editing && (
                      <>
                        <hr className="my-4" />
                        {(!f.completed_jobs && !f.total_earnings) ? (
                          <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3 text-muted">
                            <div className="d-flex align-items-center gap-3">
                              <div className="rounded-circle bg-white border d-flex align-items-center justify-content-center text-muted" style={{ width: '40px', height: '40px' }}>
                                <i className="bi bi-briefcase"></i>
                              </div>
                              <div>
                                <div className="fw-medium text-dark small">No completed contracts yet</div>
                                <div className="text-muted small">Completed projects and escrow earnings will display here.</div>
                              </div>
                            </div>
                            {isOwnProfile && (
                              <Link to="/explore" className="btn btn-sm btn-outline-dark rounded-pill px-3">
                                Find Work
                              </Link>
                            )}
                          </div>
                        ) : (
                          <div className="row g-3">
                            <div className="col-sm-6">
                              <div className="d-flex align-items-center gap-3 bg-light rounded-3 p-3">
                                <div className="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px', minWidth: '45px' }}>
                                  <i className="bi bi-check-circle-fill text-success"></i>
                                </div>
                                <div>
                                  <div className="fw-bold text-dark">{f.completed_jobs || 0} {f.completed_jobs === 1 ? 'Project' : 'Projects'}</div>
                                  <div className="text-muted small">Completed successfully</div>
                                </div>
                              </div>
                            </div>
                            <div className="col-sm-6">
                              <div className="d-flex align-items-center gap-3 bg-light rounded-3 p-3">
                                <div className="rounded-circle bg-warning bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px', minWidth: '45px' }}>
                                  <i className="bi bi-cash-stack text-warning"></i>
                                </div>
                                <div>
                                  <div className="fw-bold text-dark">₱{(f.total_earnings || 0).toLocaleString()}</div>
                                  <div className="text-muted small">Total earnings on RaketBase</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── Experience Tab ────────────────────────────────── */}
              {activeTab === 'experience' && (
                <div className="card shadow-sm border-0 mb-4">
                  <div className="card-header bg-white border-bottom-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold text-dark mb-0"><i className="bi bi-building me-2 text-muted"></i>Work Experience</h5>
                    {editing && (
                      <button className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={addExperience}>
                        <i className="bi bi-plus-lg me-1"></i>Add
                      </button>
                    )}
                  </div>
                  <div className="card-body px-4 pb-4">
                    {editing ? (
                      form.experience.length === 0 ? (
                        <p className="text-muted text-center py-3">No experience added yet. Click "Add" above to get started.</p>
                      ) : (
                        form.experience.map((exp, i) => (
                          <div key={i} className="border rounded-3 p-3 mb-3 bg-light">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <span className="badge bg-dark rounded-pill">#{i + 1}</span>
                              <button className="btn btn-sm btn-outline-danger rounded-pill px-2 py-0" onClick={() => removeExperience(i)}>
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                            <div className="row g-2 mb-2">
                              <div className="col-sm-6">
                                <input type="text" className="form-control form-control-sm bg-white" placeholder="Job Title" value={exp.jobTitle || ''} onChange={(e) => updateExperience(i, 'jobTitle', e.target.value)} />
                              </div>
                              <div className="col-sm-6">
                                <input type="text" className="form-control form-control-sm bg-white" placeholder="Company Name" value={exp.company || ''} onChange={(e) => updateExperience(i, 'company', e.target.value)} />
                              </div>
                            </div>
                            <div className="row g-2 mb-2">
                              <div className="col-sm-6">
                                <input type="text" className="form-control form-control-sm bg-white" placeholder="Start Date (e.g. Jan 2023)" value={exp.startDate || ''} onChange={(e) => updateExperience(i, 'startDate', e.target.value)} />
                              </div>
                              <div className="col-sm-6">
                                <input type="text" className="form-control form-control-sm bg-white" placeholder="End Date (e.g. Present)" value={exp.endDate || ''} onChange={(e) => updateExperience(i, 'endDate', e.target.value)} />
                              </div>
                            </div>
                            <textarea className="form-control form-control-sm bg-white" rows="2" placeholder="Brief description of responsibilities and achievements" value={exp.description || ''} onChange={(e) => updateExperience(i, 'description', e.target.value)} />
                          </div>
                        ))
                      )
                    ) : (
                      experienceArr.length === 0 ? (
                        <p className="text-muted fst-italic text-center py-3">No work experience added yet.</p>
                      ) : (
                        experienceArr.map((exp, i) => (
                          <div key={i}>
                            {i > 0 && <hr className="my-4" />}
                            <div className="d-flex justify-content-between align-items-start flex-wrap mb-2">
                              <div>
                                <h6 className="fw-bold text-dark mb-1">{exp.jobTitle}</h6>
                                <p className="text-muted mb-0 small"><i className="bi bi-building me-1"></i>{exp.company}</p>
                              </div>
                              <span className="badge bg-light text-muted border rounded-pill px-3 py-2 fw-medium mt-1" style={{ fontSize: '0.78rem' }}>
                                <i className="bi bi-calendar3 me-1"></i>{exp.startDate} – {exp.endDate}
                              </span>
                            </div>
                            <p className="text-muted mt-2 mb-0" style={{ lineHeight: '1.7', fontSize: '0.9rem' }}>{exp.description}</p>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>
              )}

              {/* ── Education Tab ─────────────────────────────────── */}
              {activeTab === 'education' && (
                <div className="card shadow-sm border-0 mb-4">
                  <div className="card-header bg-white border-bottom-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold text-dark mb-0"><i className="bi bi-mortarboard-fill me-2 text-muted"></i>Education</h5>
                    {editing && (
                      <button className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={addEducation}>
                        <i className="bi bi-plus-lg me-1"></i>Add
                      </button>
                    )}
                  </div>
                  <div className="card-body px-4 pb-4">
                    {editing ? (
                      form.education.length === 0 ? (
                        <p className="text-muted text-center py-3">No education added yet. Click "Add" above to get started.</p>
                      ) : (
                        form.education.map((edu, i) => (
                          <div key={i} className="border rounded-3 p-3 mb-3 bg-light">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <span className="badge bg-dark rounded-pill">#{i + 1}</span>
                              <button className="btn btn-sm btn-outline-danger rounded-pill px-2 py-0" onClick={() => removeEducation(i)}>
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                            <div className="mb-2">
                              <input type="text" className="form-control form-control-sm bg-white" placeholder="Degree (e.g. BS Computer Science)" value={edu.degree || ''} onChange={(e) => updateEducation(i, 'degree', e.target.value)} />
                            </div>
                            <div className="row g-2">
                              <div className="col-sm-8">
                                <input type="text" className="form-control form-control-sm bg-white" placeholder="Institution" value={edu.institution || ''} onChange={(e) => updateEducation(i, 'institution', e.target.value)} />
                              </div>
                              <div className="col-sm-4">
                                <input type="text" className="form-control form-control-sm bg-white" placeholder="Year (e.g. 2019)" value={edu.year || ''} onChange={(e) => updateEducation(i, 'year', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        ))
                      )
                    ) : (
                      educationArr.length === 0 ? (
                        <p className="text-muted fst-italic text-center py-3">No education added yet.</p>
                      ) : (
                        educationArr.map((edu, i) => (
                          <div key={i}>
                            {i > 0 && <hr className="my-4" />}
                            <div className="d-flex align-items-start gap-3">
                              <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '50px', height: '50px' }}>
                                <i className="bi bi-mortarboard-fill text-primary fs-5"></i>
                              </div>
                              <div>
                                <h6 className="fw-bold text-dark mb-1">{edu.degree}</h6>
                                <p className="text-muted mb-0 small"><i className="bi bi-building me-1"></i>{edu.institution}</p>
                                <p className="text-muted mb-0 small mt-1"><i className="bi bi-calendar3 me-1"></i>{edu.year}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      
    </>
  );
}



