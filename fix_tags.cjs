const fs = require('fs');

let createJobPath = 'c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/CreateJob.jsx';
let createJob = fs.readFileSync(createJobPath, 'utf8');
let lastDivMatch = createJob.lastIndexOf('</div>\r\n    );\r\n}');
if (lastDivMatch !== -1) {
    createJob = createJob.substring(0, lastDivMatch) + '</>\r\n    );\r\n}' + createJob.substring(lastDivMatch + 21);
    fs.writeFileSync(createJobPath, createJob);
} else {
    // try \n instead of \r\n
    lastDivMatch = createJob.lastIndexOf('</div>\n    );\n}');
    if (lastDivMatch !== -1) {
        createJob = createJob.substring(0, lastDivMatch) + '</>\n    );\n}' + createJob.substring(lastDivMatch + 16);
        fs.writeFileSync(createJobPath, createJob);
    } else {
        console.log("CreateJob.jsx pattern not found");
    }
}

let clientJobPath = 'c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/ClientJobView.jsx';
let clientJob = fs.readFileSync(clientJobPath, 'utf8');
let cjMatch = clientJob.indexOf('</div>\r\n  );\r\n}\r\n\r\nfunction ProposalsForJob');
if (cjMatch !== -1) {
    clientJob = clientJob.substring(0, cjMatch) + '</>\r\n  );\r\n}\r\n\r\nfunction ProposalsForJob' + clientJob.substring(cjMatch + 46);
    fs.writeFileSync(clientJobPath, clientJob);
} else {
    cjMatch = clientJob.indexOf('</div>\n  );\n}\n\nfunction ProposalsForJob');
    if (cjMatch !== -1) {
        clientJob = clientJob.substring(0, cjMatch) + '</>\n  );\n}\n\nfunction ProposalsForJob' + clientJob.substring(cjMatch + 39);
        fs.writeFileSync(clientJobPath, clientJob);
    } else {
        console.log("ClientJobView.jsx pattern not found");
    }
}
console.log('Script done');
