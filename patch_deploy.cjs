const fs = require('fs');
let content = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');

const target = `          VITE_FIREBASE_MESSAGING_SENDER_ID: \${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: \${{ secrets.VITE_FIREBASE_APP_ID }}`;

const replace = `          VITE_FIREBASE_MESSAGING_SENDER_ID: \${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: \${{ secrets.VITE_FIREBASE_APP_ID }}
          VITE_FIREBASE_MEASUREMENT_ID: \${{ secrets.VITE_FIREBASE_MEASUREMENT_ID }}`;

content = content.replace(target, replace);
fs.writeFileSync('.github/workflows/deploy.yml', content);
