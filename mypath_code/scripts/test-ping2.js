fetch("https://mypath-hub.vercel.app/ping")
  .then(res => res.text())
  .then(text => console.log("mypath-hub PING:", text))
  .catch(console.error);
