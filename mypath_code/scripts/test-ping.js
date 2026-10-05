fetch("https://mypath-backend-two.vercel.app/ping")
  .then(res => res.text())
  .then(text => console.log("PING:", text))
  .catch(console.error);
