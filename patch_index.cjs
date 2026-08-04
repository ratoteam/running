const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

content = content.replace('<title>My Google AI Studio App</title>', '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />\n    <title>Rato Team Running</title>');

fs.writeFileSync('index.html', content);
