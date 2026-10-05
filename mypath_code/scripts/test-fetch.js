fetch("https://mypath-backend-two.vercel.app/send-exam-alerts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "test@example.com", name: "Test", newExams: [{ title: "Test Exam" }] })
}).then(res => res.text().then(text => console.log(res.status, text))).catch(console.error);
