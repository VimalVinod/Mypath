async function test() {
  // 1. Test ping
  const ping = await fetch("https://mypath-hub.vercel.app/ping").then(r => r.text());
  console.log("PING:", ping);

  // 2. Test match-user with the real UID
  const match = await fetch("https://mypath-hub.vercel.app/match-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "HJkzgyaTqCNo7HsjRaLOnJ1Gd8O2" })
  }).then(r => r.json());
  console.log("MATCH-USER result:", JSON.stringify(match, null, 2));
}
test().catch(console.error);
