// Sanity endpoint to confirm Node runtime (should return v20.x)
module.exports = async (req, res) => {
  res.json({ ok: true, node: process.version });
};
