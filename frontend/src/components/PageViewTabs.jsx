// Underlined view switcher at the top of a page (e.g. "My proposals | Offers received").
export default function PageViewTabs({ tabs, value, onChange }) {
  return (
    <ul className="nav nav-underline mb-4 border-bottom" role="tablist">
      {tabs.map((t) => (
        <li className="nav-item" key={t.id} role="presentation">
          <button
            type="button"
            role="tab"
            aria-selected={value === t.id}
            className={`nav-link fw-medium ${value === t.id ? 'active' : 'text-muted'}`}
            style={value === t.id ? { color: '#FF5A1E', borderBottomColor: '#FF5A1E' } : undefined}
            onClick={() => onChange(t.id)}
          >
            {t.icon && <i className={`bi ${t.icon} me-1`}></i>}
            {t.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
