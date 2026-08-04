const { build } = require('vite');
build({ base: '/running/' }).then(() => console.log('done')).catch(console.error);
