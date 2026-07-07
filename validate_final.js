const https = require('https');
const service = 'site-fivem-policia-2026.vercel.app';

function request(path, method, body, token) {
/* eslint-disable no-unused-vars, prettier/prettier */
const fs = require('fs');
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = https.request({ hostname: service, path, method, headers }, (res) => {
      let resp = '';
      res.on('data', (chunk) => (resp += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resp) });
        } catch (err) {
          resolve({ status: res.statusCode, body: resp });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const login = await request('/api/login', 'POST', { username: 'admin', password: 'pmpe2026' });
    console.log('login', login.status, login.body);
    if (login.status !== 200 || !login.body.token) return;

    const token = login.body.token;

    const upload = await request(
      '/api/upload',
      'POST',
      {
        base64:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=',
      },
      token
    );
    console.log('upload', upload.status, upload.body);
    if (upload.status !== 200 || !upload.body.url) return;

    const save = await request(
      '/api/content',
      'POST',
      { history: { title: 'FINAL_VALIDATION_SAVE_3' } },
      token
    );
    console.log('save', save.status, save.body);

    const read = await request('/api/content', 'GET');
    console.log(
      'read',
      read.status,
      typeof read.body === 'object' ? read.body.history?.title : read.body
    );
  } catch (err) {
    console.error(err);
  }
})();
