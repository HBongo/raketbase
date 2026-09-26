const fs = require('fs');

let path = 'c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/DisputeTicket.jsx';
let content = fs.readFileSync(path, 'utf8');

const startIdx = content.indexOf('{/* Sidebar */}');
const endIdx = content.indexOf('<div className="flex-grow-1 p-3">');

if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + content.substring(endIdx + 33);
    content = content.replace('          <div className="row g-4 justify-content-center">', '          <div className="row g-4 mb-4 justify-content-center">');
    content = content.replace('      </div>\r\n    </>\r\n  );\r\n}', '    </>\r\n  );\r\n}');
    content = content.replace('      </div>\n    </>\n  );\n}', '    </>\n  );\n}');
    fs.writeFileSync(path, content);
    console.log("DisputeTicket layout fixed");
} else {
    console.log("DisputeTicket pattern not found");
}
