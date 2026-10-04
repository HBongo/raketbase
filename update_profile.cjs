const fs = require('fs');
let content = fs.readFileSync('c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/Profile.jsx', 'utf8');

// 1. Avatar formats and size limit
content = content.replace('accept="image/png,image/jpeg,image/webp"', 'accept=".jpg,.jpeg,.png"');
content = content.replace('const maxSize = 2 * 1024 * 1024; // 2MB', 'const maxSize = 5 * 1024 * 1024; // 5MB');
content = content.replace("Image must be under 2MB", "Image must be under 5MB");

// 2. Phone number text input to validated text input
content = content.replace(
  '<input type="text" className="form-control bg-light" placeholder="+639123456789" value={form.phone} onChange={(e) => handleChange(\'phone\', e.target.value)} />',
  '<input type="text" className="form-control bg-light" placeholder="+639123456789" value={form.phone} onChange={(e) => { const v = e.target.value.replace(/[^0-9+]/g, ""); handleChange("phone", v); }} maxLength="14" /><div className="form-text small text-muted">10-13 digits, optional + sign.</div>'
);

// 3. Location to Dropdown
content = content.replace(
  '<input type="text" className="form-control bg-light" placeholder="e.g. Manila, Philippines" value={form.location} onChange={(e) => handleChange(\'location\', e.target.value)} />',
  `<select className="form-select bg-light" value={form.location} onChange={(e) => handleChange('location', e.target.value)}>
    <option value="">Select a region...</option>
    <option value="Metro Manila">Metro Manila</option>
    <option value="Cebu">Cebu</option>
    <option value="Davao">Davao</option>
    <option value="Other">Other</option>
  </select>`
);

// 4. Title to alphanumeric max 50
content = content.replace(
  '<input type="text" className="form-control bg-light" placeholder="e.g. Full Stack Developer" value={form.title} onChange={(e) => handleChange(\'title\', e.target.value)} />',
  '<input type="text" className="form-control bg-light" placeholder="e.g. Full Stack Developer" maxLength="50" value={form.title} onChange={(e) => { const v = e.target.value.replace(/[^A-Za-z0-9 ]/g, ""); handleChange("title", v); }} />'
);

// 5. Experience description min 50 max 1000, strip HTML
content = content.replace(
  '<textarea className="form-control bg-light" rows="3" placeholder="Describe your responsibilities and achievements..." value={exp.description} onChange={(e) => updateExperience(i, \'description\', e.target.value)}></textarea>',
  '<textarea className="form-control bg-light" rows="3" minLength="50" maxLength="1000" placeholder="Describe your responsibilities (Min 50 chars)..." value={exp.description} onChange={(e) => updateExperience(i, "description", e.target.value.replace(/<[^>]*>?/gm, ""))} required></textarea>'
);

// 6. Education degree to dropdown, institution to alphanumeric max 100
content = content.replace(
  '<input type="text" className="form-control bg-light" placeholder="e.g. Bachelor of Science in Computer Science" value={edu.degree} onChange={(e) => updateEducation(i, \'degree\', e.target.value)} />',
  `<select className="form-select bg-light" value={edu.degree} onChange={(e) => updateEducation(i, 'degree', e.target.value)}>
    <option value="">Select level...</option>
    <option value="High School">High School</option>
    <option value="Associate Degree">Associate Degree</option>
    <option value="Bachelor\\'s Degree">Bachelor\\'s Degree</option>
    <option value="Master\\'s Degree">Master\\'s Degree</option>
    <option value="Doctorate">Doctorate</option>
  </select>`
);

content = content.replace(
  '<input type="text" className="form-control bg-light" placeholder="e.g. University of the Philippines" value={edu.institution} onChange={(e) => updateEducation(i, \'institution\', e.target.value)} />',
  '<input type="text" className="form-control bg-light" placeholder="School/University" maxLength="100" value={edu.institution} onChange={(e) => { const v = e.target.value.replace(/[^A-Za-z0-9 ]/g, ""); updateEducation(i, "institution", v); }} />'
);

fs.writeFileSync('c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/Profile.jsx', content);
console.log('Profile.jsx updated');
