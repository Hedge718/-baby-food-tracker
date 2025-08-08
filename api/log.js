// api/log.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {}

  const { level = 'info', message = '', context = {} } = body;
  const stamp = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : 'log'](`[client:${level}] ${stamp} — ${message}`, context);

  res.status(200).json({ ok: true });
}
