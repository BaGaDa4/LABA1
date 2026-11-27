const http = require('http');

const GROUP = 'ББМО-01-23';
const STUDENT = 'ГРИНКЕВИЧ ЕГОР РУСЛАНОВИЧ ';        // <- впиши своё ФИО
const MAX_BODY = 1024 * 1024;      // 1 МБ

class HttpError extends Error {
  constructor(status, message) {
    super(message || http.STATUS_CODES[status]);
    this.status = status;
  }
}

const pad = (n) => String(n).padStart(2, '0');

function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

const htmlPage = (title, body) => `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
${body}
</body>
</html>`;

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}
const sendHtml = (res, status, html) => send(res, status, html, 'text/html; charset=utf-8');
const sendJson = (res, status, data) =>
  send(res, status, JSON.stringify(data, null, 2), 'application/json; charset=utf-8');
const sendText = (res, status, text) => send(res, status, text, 'text/plain; charset=utf-8');

function parseJson(buffer) {
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new HttpError(400, 'Некорректный JSON');
  }
}

// Чтение тела запроса: Readable Stream -> собираем chunks вручную
function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    let finished = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      req.bodySize = size;
      if (size > limit) {
        tooLarge = true;
        chunks.length = 0;                      // память больше не копим
        if (size > limit * 10) req.destroy();   // жёсткая отсечка для гигантских тел
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      finished = true;
      if (tooLarge) reject(new HttpError(413));
      else resolve(Buffer.concat(chunks));
    });

    req.on('error', reject);

    req.on('close', () => {
      if (!finished) {
        reject(tooLarge ? new HttpError(413) : new HttpError(400, 'Соединение закрыто до получения всего тела'));
      }
    });
  });
}

async function readJson(req) {
  return parseJson(await readBody(req));
}

module.exports = {
  GROUP, STUDENT, MAX_BODY, HttpError,
  timestamp, escapeHtml, htmlPage,
  send, sendHtml, sendJson, sendText,
  parseJson, readBody, readJson,
};