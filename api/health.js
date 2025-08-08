// api/health.js
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    hasKey: !!process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
  });
}
