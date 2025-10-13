// /api/session-status.js
export const config = { runtime: 'nodejs18.x' };
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export default async function handler(req, res) {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });
    const s = await stripe.checkout.sessions.retrieve(session_id, { expand: ['subscription','customer'] });
    let status = 'none', email = null, customerId = null;
    email = s.customer_details?.email || s.customer_email || null;
    customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id || null;
    if (s.mode === 'subscription') {
      status = s.subscription?.status || 'incomplete';
    } else {
      status = s.payment_status === 'paid' ? 'active' : s.payment_status || 'unpaid';
    }
    res.json({ ok: true, status, email, customerId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
