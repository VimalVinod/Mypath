fetch("https://mypath-backend-two.vercel.app/send-exam-alerts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    email: "sindhusachu2004@gmail.com", 
    name: "Abhishek", 
    newExams: [{ title: "MyPath Test Exam 2026", applicationEndDate: "31-12-2026" }] 
  })
})
.then(res => res.json().then(data => console.log(res.status, data)))
.catch(console.error);
