// Netlify Function — creates a Stripe Checkout Session for accessory orders.
//
// Reuses the same STRIPE_SECRET_KEY env var as create-checkout.js.
// Collects a shipping address in Stripe Checkout so you (manual fulfillment)
// have everything needed to place the order on CJ Dropshipping.
//
// Each cart item carries a `cjSku` field. Right now it's just stored in the
// session metadata so it shows up in your Stripe dashboard. When you move to
// auto-fulfillment, a Stripe `checkout.session.completed` webhook can read
// this metadata and call the CJ Dropshipping order API.
//
// Node 18+ (fetch built-in, no npm packages needed)

exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Stripe not configured' }) };
  }

  let data;
  try { data = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const { cart, email } = data;
  if (!Array.isArray(cart) || cart.length === 0) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Cart is empty' }) };
  }

  const params = new URLSearchParams();
  params.append('mode', 'payment');
  if (email) params.append('customer_email', email);

  const base = process.env.URL || 'https://cosmic-sopapillas-8639fe.netlify.app';
  params.append('success_url', base + '/?payment=success&type=accessories&session_id={CHECKOUT_SESSION_ID}');
  params.append('cancel_url',  base + '/?payment=cancelled&type=accessories');

  // Collect a delivery address (needed to fulfill the dropship order)
  params.append('shipping_address_collection[allowed_countries][]', 'AU');
  params.append('phone_number_collection[enabled]', 'true');

  // Line items + a compact summary string for fulfillment / CJ mapping
  let i = 0;
  const summary = [];
  for (const item of cart) {
    const price = Number(item.price);
    const qty = Math.max(1, parseInt(item.qty, 10) || 1);
    if (!item.name || !(price >= 0)) continue;

    params.append(`line_items[${i}][price_data][currency]`, 'aud');
    params.append(`line_items[${i}][price_data][product_data][name]`, String(item.name));
    if (item.cjSku) {
      params.append(`line_items[${i}][price_data][product_data][metadata][cj_sku]`, String(item.cjSku));
    }
    params.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round(price * 100)));
    params.append(`line_items[${i}][quantity]`, String(qty));
    i++;

    summary.push(`${qty}x ${item.name}${item.cjSku ? ' [CJ:' + item.cjSku + ']' : ''}`);
  }

  if (i === 0) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'No valid items' }) };
  }

  params.append('metadata[order_type]', 'accessories');
  params.append('metadata[items]', summary.join(' | ').slice(0, 500));

  params.append('payment_method_types[]', 'card');

  try {
    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await resp.json();

    if (!resp.ok) {
      console.error('Stripe error:', session.error);
      return {
        statusCode: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: session.error?.message || 'Stripe error' }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
