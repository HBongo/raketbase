// StartChatModal.jsx — First message of a chat started from someone's profile.
// Sending it creates the chat (so accidental clicks never leave empty chats) and opens Messages.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startProfileChat } from '../services/api';

const MESSAGE_MAX = 2000;

// recipientId / recipientName: who you're messaging; asRole: 'client' or 'freelancer' (their side)
export default function StartChatModal({ recipientId, recipientName, asRole, onClose }) {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSend(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await startProfileChat(recipientId, content.trim());
      navigate(`/messages/${res.data.conversation_id}`);
    } catch (err) {
      setError(err.message || 'Could not send your message.');
      setSending(false);
    }
  }

  return (
    <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="start-chat-title" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <form className="modal-content shadow" onSubmit={handleSend}>
          <div className="modal-header">
            <h5 className="modal-title fw-bold" id="start-chat-title">
              <i className="bi bi-chat-dots me-2"></i>Message {recipientName}
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} disabled={sending}></button>
          </div>
          <div className="modal-body">
            <p className="text-muted small">
              {asRole === 'freelancer'
                ? `Ask ${recipientName} about their work, availability, or a project you have in mind.`
                : `Ask ${recipientName} about the work they're hiring for.`}
              {' '}Your chat will appear in Messages, and either of you can ask to delete it at any time.
            </p>
            {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
            <label className="form-label small fw-medium text-dark" htmlFor="start-chat-message">Your message</label>
            <textarea
              id="start-chat-message"
              className="form-control"
              rows="5"
              maxLength={MESSAGE_MAX}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={sending}
              autoFocus
            />
            <div className="form-text text-end">{content.length}/{MESSAGE_MAX}</div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose} disabled={sending}>Cancel</button>
            <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={sending || !content.trim()}>
              {sending ? <><span className="spinner-border spinner-border-sm me-2"></span>Sending...</> : <><i className="bi bi-send me-2"></i>Send</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
