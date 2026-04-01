const LEMON_SECRET = process.env.LEMON_SECRET;
const RESEND_KEY   = process.env.RESEND_KEY;
const SB_URL       = process.env.SB_URL;
const SB_SERVICE_KEY = process.env.SB_SERVICE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  const crypto = require('crypto');
  const sig = event.headers['x-signature'];
  const hmac = crypto.createHmac('sha256', LEMON_SECRET)
    .update(event.body).digest('hex');
  if (sig !== hmac) return { statusCode: 401, body: 'Invalid signature' };

  const payload = JSON.parse(event.body);
  if (payload.meta?.event_name !== 'order_created') return { statusCode: 200 };

  const email = payload.data?.attributes?.user_email;
  const productName = payload.data?.attributes?.first_order_item?.product_name || '';
  const type = productName.toLowerCase().includes('lifetime') ? 'lifetime' : 'monthly';

  const code = 'ORISA-' +
    Math.random().toString(36).slice(2,6).toUpperCase() + '-' +
    Math.random().toString(36).slice(2,6).toUpperCase();

  await fetch(`${SB_URL}/rest/v1/access_codes`, {
    method: 'POST',
    headers: {
      'apikey': SB_SERVICE_KEY,
      'Authorization': 'Bearer ' + SB_SERVICE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, type, email, used: false })
  });

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + RESEND_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Orisa <bonjour@orisa.store>',
      to: email,
      subject: '🌸 Ton accès Orisa est prêt !',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="font-family:Georgia,serif;color:#D4798E">Bienvenue sur Orisa 🌸</h2>
          <p style="color:#555">Merci pour ton achat ! Voici ton code d'accès personnel :</p>
          <div style="background:#FAE0E7;border-radius:12px;padding:24px;text-a
