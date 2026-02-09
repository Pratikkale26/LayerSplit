const httpProxy = require('http-proxy');
const http = require('http');

const proxy = httpProxy.createProxyServer({
  changeOrigin: true, // Rewrites the 'Host' header to match the target
  ws: true            // Enable built-in websocket support
});

const server = http.createServer((req: any, res: any) => {
  if (req.url.startsWith('/api')) {
    proxy.web(req, res, { target: 'http://localhost:3001' });
  } else {
    proxy.web(req, res, { target: 'http://localhost:3000' });
  }
});

// --- THE FIX: Handle WebSocket Upgrades ---
server.on('upgrade', (req: any, socket: any, head: any) => {
  // Most HMR traffic in Next.js goes through /_next/webpack-hmr
  if (req.url.startsWith('/_next/webpack-hmr')) {
    proxy.ws(req, socket, head, { target: 'http://localhost:3000' });
    console.log('WS: HMR upgraded to Next.js');
  } else {
    // If your backend also uses WebSockets, route them here
    proxy.ws(req, socket, head, { target: 'http://localhost:3001' });
  }
});

proxy.on('error', (err: any, req: any, res: any) => {
  // Check if res exists (it won't for WebSocket errors)
  if (res && res.writeHead) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Proxy Error: Ensure your services are running.');
  }
  console.error('Proxy Error:', err.message);
});

console.log("Proxy gateway running on http://localhost:5000");
server.listen(5000);