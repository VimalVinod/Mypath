const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
    if (req.url === '/1') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(fs.readFileSync('preview-email.html'));
    } else if (req.url === '/2') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(fs.readFileSync('preview-alerts.html'));
    } else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('<h1>Email Previews</h1><ul><li><a href="/1">Verification Email Preview</a></li><li><a href="/2">Exam Alerts Email Preview</a></li></ul>');
    }
});

server.listen(3333, () => {
    console.log('Server is running on http://localhost:3333');
});
