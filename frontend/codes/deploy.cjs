const { execSync } = require('child_process');

console.log("Waiting for build to finish...");
// Wait 15 seconds to ensure build is done
setTimeout(() => {
  try {
    console.log("Running firebase deploy...");
    const out = execSync("firebase deploy --non-interactive", { stdio: 'inherit' });
    console.log("Deployed successfully!");
  } catch (err) {
    console.error("Deploy failed", err);
  }
}, 15000);
