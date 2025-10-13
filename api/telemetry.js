// /api/telemetry.js
export const config = { runtime: 'nodejs18.x' };

let mem = [];              // per-instance memory; good enough for MVP
const MAX = 1000;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const body = await req.json?.() ?? {};
    const events = Array.isArray(body.events) ? body.events : [];
    const ts = Date.now();
    for (const ev of events) {
      mem.push({ ts, ...ev });
      if (mem.length > MAX) mem.shift();
    }
    res.json({ ok: true, stored: events.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

export function _dump() { return mem; } // for admin export (front-end calls /api/telemetry?export=1 if you add it later)
