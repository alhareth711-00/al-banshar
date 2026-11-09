const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');
const clientRegistry = require('./clientRegistry');

const PORT = process.env.DEV_PORT || 4800;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk.toString()));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('تنسيق البيانات غير صحيح (Invalid JSON)'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost:4800'}`);
  const pathname = reqUrl.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  try {
    // 1. API: List clients and stats
    if (method === 'GET' && pathname === '/api/clients') {
      const clients = clientRegistry.loadClients();
      const stats = clientRegistry.getStats();
      return sendJson(res, 200, { success: true, data: { clients, stats } });
    }

    // 2. API: Add client
    if (method === 'POST' && pathname === '/api/clients') {
      const body = await parseBody(req);
      const newClient = clientRegistry.addClient(body);
      return sendJson(res, 201, {
        success: true,
        message: 'تم تسجيل الورشة وتوليد مفتاح الترخيص بنجاح 🔑',
        data: newClient,
      });
    }

    // 3. API: Renew client subscription
    const renewMatch = pathname.match(/^\/api\/clients\/([^/]+)\/renew$/);
    if (method === 'POST' && renewMatch) {
      const clientId = renewMatch[1];
      const body = await parseBody(req);
      const updated = clientRegistry.renewClient(clientId, body);
      return sendJson(res, 200, {
        success: true,
        message: 'تم تجديد الاشتراك وتحديث مفتاح التفعيل بنجاح ⚡',
        data: updated,
      });
    }

    // 4. API: Delete client
    const deleteMatch = pathname.match(/^\/api\/clients\/([^/]+)$/);
    if (method === 'DELETE' && deleteMatch) {
      const clientId = deleteMatch[1];
      clientRegistry.deleteClient(clientId);
      return sendJson(res, 200, { success: true, message: 'تم حذف سجل الورشة بنجاح' });
    }

    // 5. Static Files Serving
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(content);
  } catch (err) {
    return sendJson(res, 400, { success: false, message: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================================`);
  console.log(`   🛠️  لوحة تحكم وسجل المطور لتراخيص سريع وبنشر PRO`);
  console.log(`======================================================================`);
  console.log(`📡 الخادم يعمل الآن على الرابط: http://localhost:${PORT}`);
  console.log(`💡 افتح المتصفح لمتابعة ورش عملائك، تجديد الاشتراكات، وإرسال رسائل الواتساب.\n`);
});

module.exports = server;
