import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReceivedOffers, getSentOffers, acceptOffer, declineOffer, withdrawOffer } from '../services/api';
import { showToast } from '../utils/toast';
import OfferCard from './OfferCard';

import { useLive } from '../utils/useLive';
// "Offers received" (freelancer, on My Proposals) or "Sent offers" (client, on My Postings).
export default function OffersList({ side }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = side === 'received' ? await getReceivedOffers() : await getSentOffers();
      setOffers(res.data || []);
    } catch (err) {
      setError(err.message || 'Could not load offers.');
    } finally {
      setLoading(false);
    }
  }, [side]);

  useEffect(() => {
    load();
  }, [load]);

  // Live: an offer was sent to you, or one you sent was accepted / declined / withdrawn
  useLive(['offers'], () => load());

  async function run(offerId, action, successMessage, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(offerId);
    setError('');
    try {
      await action(offerId);
      showToast(successMessage, 4000);
      await load();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <div className="text-center text-muted py-5"><span className="spinner-border spinner-border-sm me-2"></span>Loading offers...</div>;
  }

  return (
    <>
      {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
      {offers.length === 0 ? (
        <div className="card text-center py-5 border-0 shadow-sm">
          <div className="card-body">
            <h5 className="fw-bold mb-2">{side === 'received' ? 'No offers yet' : "You haven't sent any offers"}</h5>
            <p className="text-muted small mb-0">
              {side === 'received'
                ? 'When a client clicks "Hire Me" on your profile, their offer shows up here.'
                : <>Find a freelancer in <Link to="/browse">Browse Users</Link> and click "Hire Me" on their profile.</>}
            </p>
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {offers.map((o) => (
            <OfferCard
              key={o.offer_id}
              offer={o}
              side={side}
              busy={busyId === o.offer_id}
              onAccept={() => run(o.offer_id, acceptOffer, 'Offer accepted. Your new contract is on the Dashboard.', `Accept "${o.title}"? This starts a contract right away.`)}
              onDecline={() => run(o.offer_id, declineOffer, 'Offer declined.', `Decline "${o.title}"?`)}
              onWithdraw={() => run(o.offer_id, withdrawOffer, 'Offer withdrawn.', `Withdraw your offer "${o.title}"?`)}
            />
          ))}
        </div>
      )}
    </>
  );
}
