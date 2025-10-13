const { promises: fs } = require('fs');
const PATH = '/tmp/admin-config.json';

async function readCfg(){
  try{ return JSON.parse(await fs.readFile(PATH,'utf8')); }
  catch{ return { loss_guard:null, radar:null, updatedAt:0 }; }
}
async function writeCfg(cfg){
  try{ await fs.writeFile(PATH, JSON.stringify(cfg,null,2)); }catch{}
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const cfg = await readCfg();
      return res.json(cfg);
    }
    if (req.method === 'POST') {
      const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i,'').trim();
      if (!auth || auth !== process.env.ADMIN_TOKEN) return res.status(401).json({ ok:false, error:'unauthorized' });
      const body = req.body || {};
      const prev = await readCfg();
      const next = { ...prev, ...body, updatedAt: Date.now() };
      await writeCfg(next);
      return res.json({ ok:true, updatedAt: next.updatedAt });
    }
    return res.status(405).end();
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
};
