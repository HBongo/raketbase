// Shared bits for showing activity log entries (Profile → Activity and the admin Activity Log)

export const ACTIVITY_CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'account', label: 'Account', icon: 'bi-person-circle' },
  { id: 'jobs', label: 'Jobs & proposals', icon: 'bi-briefcase' },
  { id: 'contracts', label: 'Contracts & money', icon: 'bi-cash-coin' },
  { id: 'admin', label: 'Admin', icon: 'bi-shield-check' },
];

export function categoryIcon(category) {
  return ACTIVITY_CATEGORIES.find((c) => c.id === category)?.icon || 'bi-dot';
}

export function formatActivityTime(value) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
