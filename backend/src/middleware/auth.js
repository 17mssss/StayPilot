const { createClient } = require('@supabase/supabase-js');

/**
 * Assertion de démarrage : NODE_ENV doit être explicitement défini.
 * Sans cela, le comportement de sécurité est indéterminé.
 */
if (!process.env.NODE_ENV) {
  throw new Error(
    '[AUTH] NODE_ENV must be explicitly set (production | development | test). ' +
    'Refusing to start without it to prevent accidental security bypass.'
  );
}

/**
 * Middleware d'authentification via JWT Supabase.
 * Aucun bypass — toute requête sans token valide retourne 401.
 *
 * Pour les tests locaux, utilisez un vrai compte Supabase de test
 * ou mockez supabase.auth.getUser() dans vos tests unitaires.
 */
// ── Helper UUID ───────────────────────────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valide qu'un paramètre d'URL est un UUID v4 bien formé.
 * À utiliser dans les routes critiques pour se protéger contre les injections de paramètres.
 * @param {string} id
 * @returns {boolean}
 */
function validateUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    console.warn(`[AUTH] Token manquant — ${req.method} ${req.path} — IP: ${req.ip}`);
    return res.status(401).json({ success: false, error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Log de sécurité sans exposer le token (uniquement les 8 premiers chars pour le debug)
      const tokenPrefix = token ? token.substring(0, 8) + '...' : '(vide)';
      console.warn(`[AUTH] Échec authentification — ${req.method} ${req.path} — IP: ${req.ip} — token: ${tokenPrefix} — raison: ${error?.message || 'utilisateur introuvable'}`);
      return res.status(401).json({ success: false, error: 'Token invalide ou expiré' });
    }

    req.user     = user;
    req.clientId = user.id;
    req.client   = { id: user.id, email: user.email };
    next();
  } catch (err) {
    console.warn(`[AUTH] Erreur inattendue — ${req.method} ${req.path} — IP: ${req.ip} — ${err.message}`);
    return res.status(401).json({ success: false, error: 'Erreur d\'authentification' });
  }
}

module.exports = { authenticate, validateUUID };
