// Anonymous lightweight telemetry intake (in-memory)
let mem = [];
const MAX = 1000;

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const body = req.body || {};
    const events = Array.isArray(body.events) ? body.events : [];
    const ts = Date.now();
    for (const ev of events) {
      mem.push({ ts, ...ev });
      if (mem.length > MAX) mem.shift();
    }
    res.json({ ok:true, stored: events.length });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
};
