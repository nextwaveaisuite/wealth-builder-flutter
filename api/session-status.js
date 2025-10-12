// /api/session-status.js
// Given ?session_id=cs_..., returns { status: 'active'|'incomplete'|... , customer, subscription }
// Env: STRIPE_SECRET_KEY

export default async function handler(req, res) {
  try {
    const { searchParams } = new URL(req.url, 'http://localhost');
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });

    const stripe = (await import('stripe')).default(key, { apiVersion: '2024-06-20' });
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });

    const out = {
      status: session.subscription?.status || session.status || 'unknown',
      customer: session.customer,
      subscription: session.subscription?.id || null,
    };
    return res.status(200).json(out);
  } catch (e) {
    console.error('session-status error:', e);
    return res.status(500).json({ error: 'Lookup failed' });
  }
}
