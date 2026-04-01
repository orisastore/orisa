const SB_URL = process.env.SB_URL;
const SB_SERVICE_KEY = process.env.SB_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { code, device_id } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: 'Code manquant' });
  }

  try {
    // 1. Chercher le code dans Supabase
    const r = await fetch(
      `${SB_URL}/rest/v1/access_codes?code=eq.${encodeURIComponent(code.toUpperCase())}&select=id,used,device_id,type`,
      {
        headers: {
          'apikey': SB_SERVICE_KEY,
          'Authorization': 'Bearer ' + SB_SERVICE_KEY
        }
      }
    );
    const rows = await r.json();

    if (!rows || !rows.length) {
      return res.status(400).json({ success: false, message: 'Code invalide. Vérifie ton email 📧' });
    }

    const row = rows[0];

    if (row.used) {
      return res.status(400).json({ success: false, message: 'Ce code a déjà été utilisé ❌' });
    }

    // 2. Marquer comme utilisé + enregistrer device_id
    await fetch(
      `${SB_URL}/rest/v1/access_codes?id=eq.${row.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SB_SERVICE_KEY,
          'Authorization': 'Bearer ' + SB_SERVICE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ used: true, device_id: device_id || null })
      }
    );

    return res.status(200).json({ success: true, type: row.type });

  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erreur serveur. Réessaie 😊' });
  }
}
