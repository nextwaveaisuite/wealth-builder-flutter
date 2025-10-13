// Stripe Billing Portal
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const { customerId } = req.body || {};
    if (!customerId) return res.status(400).json({ error:'customerId required' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const site = process.env.SITE_URL || `${proto}://${host}`;

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${site}/#/settings`
    });
    res.json({ url: portal.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
