const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');

const target1 = `        await import('firebase/auth').then(({ createUserWithEmailAndPassword }) => 
          createUserWithEmailAndPassword(auth, loginEmail, loginPassword)
        );`;
const replace1 = `        await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);`;

if (content.includes(target1)) {
    content = content.replace(target1, replace1);
    fs.writeFileSync('src/pages/AdminPage.tsx', content);
    console.log("Replaced dynamic import");
} else {
    console.log("Could not find dynamic import target");
}
