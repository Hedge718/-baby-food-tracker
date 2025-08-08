// src/utils/logger.js
const API_BASE = import.meta.env.VITE_API_BASE || '';

export function logInfo(message, context = {}) {
  try {
    console.log('[info]', message, context);
    fetch(`${API_BASE}/api/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'info', message, context }),
    }).catch(() => {});
  } catch {}
}

export function logError(err, context = {}) {
  const message = typeof err === 'string' ? err : err?.message || 'Unknown error';
  const stack = (err && err.stack) || undefined;
  try {
    console.error('[error]', message, context, stack);
    fetch(`${API_BASE}/api/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'error', message, context: { ...context, stack } }),
    }).catch(() => {});
  } catch {}
}
