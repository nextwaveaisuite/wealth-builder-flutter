// Serverless function: creates a Stripe Checkout Session for a subscription
// Notes:
// - For SOFTWARE ACCESS ONLY (not investing/funding).
// - Requires env vars: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, SITE_URL

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  const site = process.env.SITE_URL || 'https://wealthbuilder.nextwaveaisuite.com';

  if (!key || !price) {
    return res.status(500).json({ error: 'Stripe environment not configured' });
  }

  // Lazy import for Vercel Node functions
  const stripe = (await import('stripe')).default(key, { apiVersion: '2024-06-20' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: `${site}/#/settings`,
      cancel_url: `${site}/#/billing`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: true },
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('Stripe error:', e);
    return res.status(500).json({ error: e.message || 'Checkout failed' });
  }
}
