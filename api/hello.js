module.exports = async (req, res) => {
  res.json({ ok: true, node: process.version, time: new Date().toISOString() });
};
