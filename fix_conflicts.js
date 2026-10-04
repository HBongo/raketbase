
const fs = require('fs');

function keepHead(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Regular expression to match conflict blocks
    const regex = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n[\s\S]*?\r?\n>>>>>>> [^\r\n]+/g;
    
    let newContent = content.replace(regex, function(match, p1) {
        return p1;
    });
    
    fs.writeFileSync(filePath, newContent);
    console.log('Fixed ' + filePath);
}

keepHead('frontend/src/pages/Login.jsx');
keepHead('frontend/src/pages/Register.jsx');

