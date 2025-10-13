// Stripe Checkout (subscription or one-time lifetime)
// Env: STRIPE_SECRET_KEY, STRIPE_PRICE_ID_MONTHLY, STRIPE_PRICE_ID_LIFETIME (optional), SITE_URL (optional)
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const { email, plan } = req.body || {};
    const priceId = plan === 'lifetime' ? process.env.STRIPE_PRICE_ID_LIFETIME : process.env.STRIPE_PRICE_ID_MONTHLY;
    if (!priceId) return res.status(400).json({ error: 'Missing price id' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host']  || req.headers.host;
    const site  = process.env.SITE_URL || `${proto}://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: plan === 'lifetime' ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${site}/#/pro/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${site}/#/settings`,
      allow_promotion_codes: true,
      client_reference_id: email || undefined
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
