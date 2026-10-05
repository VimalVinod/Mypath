fetch("https://mypath-backend-two.vercel.app/match-user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: "k41oer39R7RCjae5nAgS4Yb3OLr2" })
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(console.error);
