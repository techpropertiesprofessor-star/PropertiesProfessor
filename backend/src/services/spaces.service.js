/**
 * DigitalOcean Spaces Service
 * S3-compatible object storage helper for uploads, listing, downloads, and deletion.
 *
 * Space structure:
 *   properties-media/
 *     Dashboard/
 *       {inventoryId}/        ← one folder per inventory unit
 *         photo1.jpg
 *         video1.mp4
 *     Website/
 *       ...
 */

const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

// ─── S3 Client (DO Spaces) ────────────────────────────────────────────
const spacesEndpoint = process.env.SPACES_ENDPOINT || `https://${process.env.SPACES_REGION || 'sgp1'}.digitaloceanspaces.com`;

// Log Spaces configuration status on startup
console.log('[SPACES_SERVICE] Configuration check:', {
  endpoint: spacesEndpoint,
  region: process.env.SPACES_REGION || 'sgp1',
  bucket: process.env.SPACES_NAME || 'properties-media',
  keyConfigured: !!process.env.SPACES_KEY,
  secretConfigured: !!process.env.SPACES_SECRET,
});

if (!process.env.SPACES_KEY || !process.env.SPACES_SECRET) {
  console.error('[SPACES_SERVICE] WARNING: SPACES_KEY or SPACES_SECRET not set! File uploads will fail.');
}

const s3 = new S3Client({
  endpoint: spacesEndpoint,
  region: process.env.SPACES_REGION || 'sgp1',
  credentials: {
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  },
  forcePathStyle: false, // DO Spaces uses virtual-hosted style
});

const BUCKET = process.env.SPACES_NAME || 'properties-media';
const ROOT_FOLDER = process.env.SPACES_ROOT_FOLDER || 'Dashboard';

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Build a storage key like  Dashboard/{inventoryId}/{filename}
 */
function buildKey(inventoryId, filename) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${ROOT_FOLDER}/${inventoryId}/${Date.now()}-${safe}`;
}

/**
 * Build public / CDN URL for an object (if Space is public or CDN is enabled).
 * Falls back to origin endpoint.
 */
function buildPublicUrl(key) {
  const cdn = process.env.SPACES_CDN_URL;
  if (cdn) return `${cdn}/${key}`;
  return `${spacesEndpoint}/${BUCKET}/${key}`;
}

// ─── Upload ───────────────────────────────────────────────────────────

/**
 * Upload a buffer/stream to Spaces.
 * @param {string} inventoryId
 * @param {string} originalFilename
 * @param {Buffer} body
 * @param {string} contentType  e.g. image/jpeg, video/mp4
 * @returns {{ key, url, size }}
 */
async function uploadFile(inventoryId, originalFilename, body, contentType) {
  const key = buildKey(inventoryId, originalFilename);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: 'private', // keep files private; serve via signed URLs
  }));
  return { key, url: buildPublicUrl(key), size: body.length };
}

// ─── Get presigned upload URL (for direct browser upload) ─────────────

/**
 * Generate a presigned PUT URL so the browser can upload directly to Spaces.
 * @param {string} inventoryId
 * @param {string} filename
 * @param {string} contentType
 * @param {number} expiresIn  seconds (default 15 min)
 * @returns {{ uploadUrl, key }}
 */
async function getPresignedUploadUrl(inventoryId, filename, contentType, expiresIn = 900) {
  const key = buildKey(inventoryId, filename);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: 'private',
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  return { uploadUrl, key };
}

// ─── Get presigned download URL ──────────────────────────────────────

/**
 * Generate a presigned GET URL for downloading/viewing a private object.
 * @param {string} key  full object key
 * @param {number} expiresIn  seconds (default 1 hour)
 * @returns {string} signed URL
 */
async function getPresignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

// ─── List objects for an inventory unit ──────────────────────────────

/**
 * List all files inside  Dashboard/{inventoryId}/
 * @param {string} inventoryId
 * @returns {Array<{ key, name, size, lastModified, contentType, downloadUrl }>}
 */
async function listFiles(inventoryId) {
  const prefix = `${ROOT_FOLDER}/${inventoryId}/`;
  const data = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
  }));

  if (!data.Contents || data.Contents.length === 0) return [];

  const files = await Promise.all(
    data.Contents
      .filter(obj => obj.Size > 0) // skip folder markers
      .map(async (obj) => {
        const downloadUrl = await getPresignedDownloadUrl(obj.Key, 3600);
        const name = obj.Key.replace(prefix, '');
        const ext = path.extname(name).toLowerCase();
        const isVideo = ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
        const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext);
        return {
          key: obj.Key,
          name,
          size: obj.Size,
          lastModified: obj.LastModified,
          type: isVideo ? 'video' : isImage ? 'image' : 'file',
          downloadUrl,
        };
      })
  );

  return files;
}

// ─── Delete object ───────────────────────────────────────────────────

/**
 * Delete a single object by key.
 * @param {string} key  full object key
 */
async function deleteFile(key) {
  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

// ─── Head (check existence / metadata) ───────────────────────────────

async function headFile(key) {
  return s3.send(new HeadObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

module.exports = {
  s3,
  BUCKET,
  ROOT_FOLDER,
  buildKey,
  buildPublicUrl,
  uploadFile,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  listFiles,
  deleteFile,
  headFile,
};
