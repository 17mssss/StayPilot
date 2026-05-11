/**
 * auth-device.js
 * Double authentification par appareil — Device Trust + OTP Email
 *
 * Endpoints :
 *   POST /api/auth/check-device   → cet appareil est-il de confiance ?
 *   POST /api/auth/send-otp       → envoie un code OTP par email
 *   POST /api/auth/verify-otp     → vérifie le code et mémorise l'appareil
 */

const express  = require('express')
const router   = express.Router()
const crypto   = require('crypto')
const bcrypt   = require('bcryptjs')
const { createClient } = require('@supabase/supabase-js')
const sgMail   = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// Client Supabase avec service role (accès complet, pas de RLS)
function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Génère un code numérique à 6 chiffres */
function generateCode() {
  return String(Math.floor(100000 + crypto.randomInt(900000))).padStart(6, '0')
}

/** Formate le user-agent en label lisible : "iPhone · Safari" */
function deviceLabel(userAgent = '') {
  const ua = userAgent.toLowerCase()
  let device = 'Ordinateur'
  if (ua.includes('iphone'))       device = 'iPhone'
  else if (ua.includes('ipad'))    device = 'iPad'
  else if (ua.includes('android')) device = 'Android'
  else if (ua.includes('macintosh')) device = 'Mac'
  else if (ua.includes('windows')) device = 'Windows'

  let browser = 'Navigateur'
  if (ua.includes('chrome') && !ua.includes('edg'))  browser = 'Chrome'
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
  else if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('edg'))     browser = 'Edge'

  return `${device} · ${browser}`
}

/** Masque partiellement l'email pour l'affichage : "j***@gmail.com" */
function maskEmail(email = '') {
  const [local, domain] = email.split('@')
  if (!domain) return email
  return local[0] + '***@' + domain
}

// ── POST /api/auth/check-device ───────────────────────────────────────────────
/**
 * Body : { userId, deviceId }
 * Response : { trusted: boolean }
 */
router.post('/check-device', async (req, res) => {
  const { userId, deviceId } = req.body

  if (!userId || !deviceId) {
    return res.status(400).json({ error: 'userId et deviceId requis' })
  }

  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('id, last_seen')
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .maybeSingle()

    if (error) throw error

    if (data) {
      // Mettre à jour le last_seen silencieusement
      await supabase
        .from('trusted_devices')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', data.id)
      return res.json({ trusted: true })
    }

    return res.json({ trusted: false })
  } catch (err) {
    console.error('[AUTH-DEVICE] check-device error:', err.message)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
/**
 * Body : { userId, deviceId, userEmail }
 * → Génère un OTP, l'envoie par email, le stocke hashé en base
 * Response : { sent: true, maskedEmail: "j***@gmail.com" }
 */
router.post('/send-otp', async (req, res) => {
  const { userId, deviceId, userEmail } = req.body

  if (!userId || !deviceId || !userEmail) {
    return res.status(400).json({ error: 'userId, deviceId et userEmail requis' })
  }

  try {
    const supabase = getServiceClient()

    // Invalider les anciens codes non utilisés pour cet appareil
    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .eq('used', false)

    // Générer et hasher le code
    const plainCode = generateCode()
    const hashedCode = await bcrypt.hash(plainCode, 10)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // +10 min

    // Stocker en base
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        user_id:    userId,
        device_id:  deviceId,
        code:       hashedCode,
        expires_at: expiresAt,
        used:       false,
        attempts:   0,
      })

    if (insertError) throw insertError

    // Envoyer l'email via SendGrid
    const label = deviceLabel(req.headers['user-agent'])
    await sgMail.send({
      to:   userEmail,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@staypilot.cc',
        name:  process.env.SENDGRID_FROM_NAME  || 'StayPilot',
      },
      subject: `${plainCode} — Votre code de connexion StayPilot`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
              <p style="margin:0;color:rgba(255,255,255,0.9);font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">StayPilot</p>
              <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Code de connexion</h1>
            </div>

            <!-- Body -->
            <div style="padding:32px;">
              <p style="margin:0 0 16px;color:#3c3c43;font-size:15px;line-height:1.6;">
                Une connexion depuis un nouvel appareil a été détectée sur votre compte.<br>
                <strong>Appareil :</strong> ${label}
              </p>

              <!-- Code -->
              <div style="background:#f5f5f7;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
                <p style="margin:0 0 8px;color:#8e8e93;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Votre code à usage unique</p>
                <p style="margin:0;font-size:40px;font-weight:700;letter-spacing:0.18em;color:#1c1c1e;">${plainCode}</p>
                <p style="margin:8px 0 0;color:#8e8e93;font-size:12px;">Expire dans <strong>10 minutes</strong></p>
              </div>

              <p style="margin:0;color:#8e8e93;font-size:13px;line-height:1.6;">
                Si vous n'êtes pas à l'origine de cette connexion, ignorez cet email — votre compte reste protégé.
              </p>
            </div>

            <!-- Footer -->
            <div style="padding:16px 32px;border-top:1px solid #f2f2f7;">
              <p style="margin:0;color:#aeaeb2;font-size:11px;">StayPilot · Votre copilote conciergerie</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Votre code de connexion StayPilot : ${plainCode}\n\nAppareil : ${label}\nExpire dans 10 minutes.\n\nSi vous n'êtes pas à l'origine de cette connexion, ignorez ce message.`,
    })

    console.log(`[AUTH-DEVICE] OTP envoyé pour user=${userId} device=${deviceId}`)
    return res.json({ sent: true, maskedEmail: maskEmail(userEmail) })
  } catch (err) {
    console.error('[AUTH-DEVICE] send-otp error:', err.message)
    return res.status(500).json({ error: 'Erreur lors de l\'envoi du code' })
  }
})

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
/**
 * Body : { userId, deviceId, code, userAgent }
 * → Vérifie le code, mémorise l'appareil si valide
 * Response : { valid: boolean, error?: string }
 */
router.post('/verify-otp', async (req, res) => {
  const { userId, deviceId, code, userAgent } = req.body

  if (!userId || !deviceId || !code) {
    return res.status(400).json({ error: 'userId, deviceId et code requis' })
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ valid: false, error: 'Format de code invalide' })
  }

  try {
    const supabase = getServiceClient()

    // Récupérer le dernier code actif non expiré
    const { data: otpRow, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (!otpRow) {
      return res.json({ valid: false, error: 'Code expiré ou introuvable. Demandez un nouveau code.' })
    }

    // Anti-brute force : max 5 tentatives
    if (otpRow.attempts >= 5) {
      await supabase.from('otp_codes').update({ used: true }).eq('id', otpRow.id)
      return res.json({ valid: false, error: 'Trop de tentatives. Demandez un nouveau code.' })
    }

    // Incrémenter le compteur de tentatives
    await supabase
      .from('otp_codes')
      .update({ attempts: otpRow.attempts + 1 })
      .eq('id', otpRow.id)

    // Vérifier le code hashé
    const isValid = await bcrypt.compare(code, otpRow.code)

    if (!isValid) {
      const remaining = 5 - (otpRow.attempts + 1)
      return res.json({
        valid: false,
        error: remaining > 0
          ? `Code incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`
          : 'Trop de tentatives. Demandez un nouveau code.',
      })
    }

    // ✅ Code valide — marquer comme utilisé
    await supabase.from('otp_codes').update({ used: true }).eq('id', otpRow.id)

    // Mémoriser l'appareil comme de confiance
    const label = deviceLabel(userAgent || req.headers['user-agent'])
    const ip    = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip

    const { error: upsertError } = await supabase
      .from('trusted_devices')
      .upsert({
        user_id:      userId,
        device_id:    deviceId,
        device_label: label,
        ip_address:   ip,
        last_seen:    new Date().toISOString(),
        created_at:   new Date().toISOString(),
      }, { onConflict: 'user_id,device_id' })

    if (upsertError) throw upsertError

    console.log(`[AUTH-DEVICE] Appareil mémorisé: user=${userId} device=${deviceId} label="${label}"`)
    return res.json({ valid: true })
  } catch (err) {
    console.error('[AUTH-DEVICE] verify-otp error:', err.message)
    return res.status(500).json({ error: 'Erreur lors de la vérification' })
  }
})

module.exports = router
