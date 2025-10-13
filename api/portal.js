// /api/portal.js
export const config = { runtime: 'nodejs18.x' };
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const { customerId } = await req.json?.() ?? {};
    if (!customerId) return res.status(400).json({ error: 'customerId required' });

    const site = process.env.SITE_URL || 'http://localhost:3000';
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${site}/#/settings`
    });
    res.json({ url: portal.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
