const fs = require('fs');

let adminContent = fs.readFileSync('src/pages/AdminPage.tsx', 'utf-8');
adminContent = adminContent.replace(
  "      console.error(error);\\n    }\\n  };",
  "      if (error.code !== 'auth/email-already-in-use' && error.code !== 'auth/wrong-password' && error.code !== 'auth/user-not-found' && error.code !== 'auth/invalid-credential') {\\n        console.error(error);\\n      }\\n    }\\n  };"
);
fs.writeFileSync('src/pages/AdminPage.tsx', adminContent);

let regContent = fs.readFileSync('src/pages/RegistrationPage.tsx', 'utf-8');
regContent = regContent.replace(
  "    } catch (e: any) {\\n      console.error(e);\\n      if (e.code === 'auth/email-already-in-use') {",
  "    } catch (e: any) {\\n      if (e.code !== 'auth/email-already-in-use' && e.code !== 'auth/wrong-password' && e.code !== 'auth/user-not-found' && e.code !== 'auth/invalid-credential') {\\n        console.error(e);\\n      }\\n      if (e.code === 'auth/email-already-in-use') {"
);
fs.writeFileSync('src/pages/RegistrationPage.tsx', regContent);
