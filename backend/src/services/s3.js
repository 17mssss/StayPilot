/**
 * s3.js
 * Upload / download de fichiers sur AWS S3.
 * Retourne null si AWS non configuré (mode dev sans S3).
 */

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let s3Client = null;

function getClient() {
  if (!s3Client) {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return null;
    }
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'eu-west-3',
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

/**
 * Upload un buffer vers S3.
 * @returns {string|null} URL publique ou null si S3 non configuré
 */
async function uploadBuffer(buffer, key, contentType = 'application/pdf') {
  const client = getClient();
  const bucket = process.env.AWS_S3_BUCKET;

  if (!client || !bucket) {
    console.warn('[S3] Non configuré — upload ignoré');
    return null;
  }

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  }));

  return `https://${bucket}.s3.${process.env.AWS_REGION || 'eu-west-3'}.amazonaws.com/${key}`;
}

/**
 * Génère une URL signée (accès temporaire à un fichier privé).
 * @param {string} key — chemin dans le bucket
 * @param {number} expiresIn — durée en secondes (défaut 1h)
 */
async function getSignedDownloadUrl(key, expiresIn = 3600) {
  const client = getClient();
  const bucket = process.env.AWS_S3_BUCKET;
  if (!client || !bucket) return null;

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  );
}

module.exports = { uploadBuffer, getSignedDownloadUrl };
