const httpProxy = require('http-proxy');
const http = require('http');

const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req: any, res: any) => {
  // If the URL starts with /api, send it to the Backend
  if (req.url.startsWith('/api')) {
    proxy.web(req, res, { target: 'http://localhost:3001' });
    console.log('routed to backend', req.url);
} 
// Otherwise, send it to the Frontend
else {
    proxy.web(req, res, { target: 'http://localhost:3000' });
    console.log('routed to frontend', req.url);
}
});

// Handle errors so the proxy doesn't crash
proxy.on('error', (err: any, req: any, res: any) => {
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end('Proxy Error: Ensure your frontend and backend are running.');
});

console.log("Proxy gateway running on http://localhost:5000");
server.listen(5000);
