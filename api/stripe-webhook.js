// /api/stripe-webhook.js
// Verifies Stripe events for your logs/monitoring.
// Set endpoint secret from Stripe: STRIPE_WEBHOOK_SECRET
// Then point a Stripe webhook to: https://wealthbuilder.nextwaveaisuite.com/api/stripe-webhook

export const config = {
  api: {
    bodyParser: false, // we must read raw body for signature verification
  },
};

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }

  const sig = req.headers['stripe-signature'];
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;

  if (!whSecret || !key) return res.status(500).send('Missing webhook env');

  const stripe = (await import('stripe')).default(key, { apiVersion: '2024-06-20' });

  let event;
  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, whSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('✅ Checkout completed:', event.data.object.id);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        console.log(`🔔 Subscription event: ${event.type}`, event.data.object.id);
        break;
      default:
        console.log(`ℹ️ Unhandled event: ${event.type}`);
    }
    return res.status(200).send('ok');
  } catch (e) {
    console.error('Webhook handler error:', e);
    return res.status(500).send('handler error');
  }
}
