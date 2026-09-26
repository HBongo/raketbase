const fs = require('fs');

let path = 'c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/DisputeTicket.jsx';
let content = fs.readFileSync(path, 'utf8');

const startIdx = content.indexOf('{/* Sidebar */}');
const endIdx = content.indexOf('{/* Page Content Here */}');

if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + content.substring(endIdx);
    
    // The component ends with:
    //       </div>
    //     </div>
    //   </>
    // );
    // Let's remove one </div> since we removed <div className="main-wrapper">
    let lastDivIdx = content.lastIndexOf('</div>');
    let secondLastDivIdx = content.lastIndexOf('</div>', lastDivIdx - 1);
    if (secondLastDivIdx !== -1) {
        content = content.substring(0, secondLastDivIdx) + content.substring(lastDivIdx);
    }
    
    fs.writeFileSync(path, content);
    console.log("DisputeTicket layout fixed");
} else {
    console.log("DisputeTicket pattern not found");
}
