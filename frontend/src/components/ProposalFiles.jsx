// ProposalFiles.jsx — A proposal's attachments as buttons that open a short-lived private link.
import { useState } from 'react';
import { getProposalFileUrl } from '../services/api';

export default function ProposalFiles({ proposalId, files }) {
  const [error, setError] = useState('');
  if (!files || files.length === 0) return null;

  async function openFile(file) {
    setError('');
    try {
      const res = await getProposalFileUrl(proposalId, file.file_id);
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message || 'Could not open that file.');
    }
  }

  return (
    <div className="mb-2">
      <div className="d-flex flex-wrap gap-2">
        {files.map((f) => (
          <button
            key={f.file_id}
            type="button"
            className="btn btn-sm btn-outline-secondary rounded-pill text-truncate"
            style={{ maxWidth: '240px' }}
            onClick={(e) => { e.stopPropagation(); openFile(f); }}
            title={`Open ${f.file_name}`}
          >
            <i className="bi bi-paperclip me-1"></i>{f.file_name}
          </button>
        ))}
      </div>
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  );
}
