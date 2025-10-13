const telemetry = require('./telemetry.js');

module.exports = async (req, res) => {
  try {
    const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i,'').trim();
    if (!auth || auth !== process.env.ADMIN_TOKEN) return res.status(401).json({ ok:false, error:'unauthorized' });

    const events = typeof telemetry._dump === 'function' ? telemetry._dump() : [];
    res.json({ ok:true, events });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
};
