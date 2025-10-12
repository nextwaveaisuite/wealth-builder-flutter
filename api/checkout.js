// /api/checkout.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID; // recurring price id, e.g. price_123
  if (!key || !price) return res.status(500).json({ error: 'Stripe env missing' });

  const stripe = require('stripe')(key);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: `${process.env.SITE_URL || 'https://your-vercel-domain'}/#/settings`,
      cancel_url: `${process.env.SITE_URL || 'https://your-vercel-domain'}/#/billing`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });
    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
