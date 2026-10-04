
const fs = require('fs');
let css = fs.readFileSync('frontend/src/styles/legal.css', 'utf8');

const darkModeVars = \
.legal-dark {
  --legal-bg: #0f172a;
  --legal-nav-bg: #1e293b;
  --legal-text: #f8fafc;
  --legal-border: #334155;
  --legal-modal-bg: #1e293b;
  --legal-modal-footer: #0f172a;
  --legal-text-muted: #94a3b8;
  --legal-tab-bg: #334155;
  --legal-tab-text: #cbd5e1;
  --legal-tab-active-bg: #0f172a;
  --legal-tab-active-text: #f8fafc;
  --legal-back-bg: #334155;
  --legal-back-hover: #475569;
}

.legal-dark .legal-viewer-title,
.legal-dark .legal-viewer h5,
.legal-dark .legal-viewer h6,
.legal-dark .legal-brand-text {
  color: #f8fafc;
}

.legal-dark .legal-viewer {
  color: #cbd5e1;
}

.legal-dark .legal-viewer-subtitle {
  color: #94a3b8;
}

.legal-dark .legal-close-btn:hover {
  background: #334155;
  color: #f8fafc;
}
\;

if (!css.includes('.legal-dark')) {
  css += '\\n' + darkModeVars;

  // Now replace hardcoded colors in legal.css with variables
  css = css.replace('background: #ffffff;', 'background: var(--legal-modal-bg, #ffffff);');
  css = css.replace('background: #f8fafc;', 'background: var(--legal-modal-footer, #f8fafc);');
  css = css.replace('background: #f1f5f9;', 'background: var(--legal-tab-bg, #f1f5f9);');
  css = css.replace('color: #475569;', 'color: var(--legal-tab-text, #475569);');
  css = css.replace('background: #ffffff;\\n  color: #0f172a;', 'background: var(--legal-tab-active-bg, #ffffff);\\n  color: var(--legal-tab-active-text, #0f172a);');
  css = css.replace('color: #64748b;', 'color: var(--legal-text-muted, #64748b);');
  css = css.replace('color: #0f172a;', 'color: var(--legal-text, #0f172a);');
  css = css.replace(/background-color: #f1f5f9;/g, 'background-color: var(--legal-back-bg, #f1f5f9);');
  css = css.replace(/background-color: #e2e8f0;/g, 'background-color: var(--legal-back-hover, #e2e8f0);');

  fs.writeFileSync('frontend/src/styles/legal.css', css);
  console.log('legal.css updated with dark mode variables!');
}
\
