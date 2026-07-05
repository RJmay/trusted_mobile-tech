// Netlify Function — creates a Stripe Checkout Session
// Requires STRIPE_SECRET_KEY environment variable set in Netlify dashboard
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

  const {
    device, spec, devicePrice,
    shippingLabel, shippingCost,
    upsells = {},
    name, email, phone,
  } = data;

  // Build line items using Stripe's form-encoded API (no SDK needed)
  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('customer_email', email || '');

  // Success/cancel URLs — process.env.URL is set automatically by Netlify
  const base = process.env.URL || 'https://cosmic-sopapillas-8639fe.netlify.app';
  params.append('success_url', base + '/?payment=success&session_id={CHECKOUT_SESSION_ID}');
  params.append('cancel_url',  base + '/?payment=cancelled');

  // Line items
  let i = 0;

  // Device
  params.append(`line_items[${i}][price_data][currency]`,                    'aud');
  params.append(`line_items[${i}][price_data][product_data][name]`,           device);
  if (spec) params.append(`line_items[${i}][price_data][product_data][description]`, spec);
  params.append(`line_items[${i}][price_data][unit_amount]`,                  String(Math.round(devicePrice * 100)));
  params.append(`line_items[${i}][quantity]`,                                  '1');
  i++;

  // Shipping (only if not free pickup)
  if (shippingCost > 0) {
    params.append(`line_items[${i}][price_data][currency]`,                   'aud');
    params.append(`line_items[${i}][price_data][product_data][name]`,          shippingLabel);
    params.append(`line_items[${i}][price_data][unit_amount]`,                 String(Math.round(shippingCost * 100)));
    params.append(`line_items[${i}][quantity]`,                                '1');
    i++;
  }

  // Upsells
  const upsellMeta = {
    cable:     ['Charger',                          500],
    protector: ['Screen Protector + Installation', 1500],
    case:      ['Protective Case',                 1000],
  };
  for (const [key, active] of Object.entries(upsells)) {
    if (active && upsellMeta[key]) {
      const [uname, ucents] = upsellMeta[key];
      params.append(`line_items[${i}][price_data][currency]`,                 'aud');
      params.append(`line_items[${i}][price_data][product_data][name]`,        uname);
      params.append(`line_items[${i}][price_data][unit_amount]`,               String(ucents));
      params.append(`line_items[${i}][quantity]`,                              '1');
      i++;
    }
  }

  // Customer metadata (visible in Stripe dashboard)
  params.append('metadata[customer_name]',  name  || '');
  params.append('metadata[customer_phone]', phone || '');
  params.append('metadata[shipping]',       shippingLabel || '');

  // Payment methods
  params.append('payment_method_types[]', 'card');

  try {
    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization':  'Bearer ' + STRIPE_SECRET_KEY,
        'Content-Type':   'application/x-www-form-urlencoded',
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
