const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:5173');
  
  // Proxy API requests to backend
  if (url.pathname.startsWith('/api')) {
    const proxy = http.request({
      hostname: 'localhost',
      port: 3000,
      path: req.url,
      method: req.method,
      headers: req.headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxy.on('error', () => {
      res.writeHead(500);
      res.end('Proxy error');
    });
    
    req.pipe(proxy);
    return;
  }
  
  // Serve static files
  let filePath = path.join(__dirname, 'dist', url.pathname);
  if (url.pathname === '/') {
    filePath = path.join(__dirname, 'dist', 'index.html');
  }
  
  try {
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    
    if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.css') contentType = 'text/css';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {'Content-Type': contentType});
    res.end(content);
  } catch(e) {
    // Handle client-side routing
    if (!url.pathname.startsWith('/assets/') && !url.pathname.includes('.')) {
      try {
        const indexHtml = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'));
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(indexHtml);
      } catch(indexError) {
        res.writeHead(404);
        res.end('Not found');
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

server.listen(5173, () => {
  console.log('Frontend running on http://localhost:5173');
});
