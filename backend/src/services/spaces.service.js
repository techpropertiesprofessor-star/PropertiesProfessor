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
  HeadBucketCommand,
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
  keyLength: process.env.SPACES_KEY ? process.env.SPACES_KEY.length : 0,
});

if (!process.env.SPACES_KEY || !process.env.SPACES_SECRET) {
  console.error('[SPACES_SERVICE] ⚠ CRITICAL: SPACES_KEY or SPACES_SECRET not set! File uploads will fail.');
}

const s3 = new S3Client({
  endpoint: spacesEndpoint,
  region: process.env.SPACES_REGION || 'sgp1',
  credentials: {
    accessKeyId: process.env.SPACES_KEY || '',
    secretAccessKey: process.env.SPACES_SECRET || '',
  },
  forcePathStyle: false, // DO Spaces uses virtual-hosted style
});

const BUCKET = process.env.SPACES_NAME || 'properties-media';
const ROOT_FOLDER = process.env.SPACES_ROOT_FOLDER || 'Dashboard';

// ─── Connection Test ──────────────────────────────────────────────────

/**
 * Verify DO Spaces connectivity on startup.
 * Runs async — does not block server start.
 */
async function testConnection() {
  if (!process.env.SPACES_KEY || !process.env.SPACES_SECRET) {
    console.error('[SPACES_SERVICE] ⚠ Skipping connection test — credentials not configured');
    return false;
  }
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`[SPACES_SERVICE] ✓ Connected to bucket "${BUCKET}" successfully`);
    return true;
  } catch (err) {
    console.error(`[SPACES_SERVICE] ✗ Failed to connect to bucket "${BUCKET}":`, err.message);
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      console.error('[SPACES_SERVICE]   → Bucket does not exist. Create it at https://cloud.digitalocean.com/spaces');
    } else if (err.name === 'Forbidden' || err.$metadata?.httpStatusCode === 403) {
      console.error('[SPACES_SERVICE]   → Access denied. Check SPACES_KEY and SPACES_SECRET credentials.');
    } else {
      console.error('[SPACES_SERVICE]   → Error details:', err.name, err.$metadata?.httpStatusCode);
    }
    return false;
  }
}

// Run connection test on module load (non-blocking)
testConnection();

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
  console.log(`[SPACES_SERVICE] Uploading: Bucket=${BUCKET}, Key=${key}, Size=${body.length}, Type=${contentType}`);

  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  };

  // Try with ACL first; if the bucket doesn't support ACL, retry without it
  try {
    await s3.send(new PutObjectCommand({ ...params, ACL: 'private' }));
  } catch (aclErr) {
    if (aclErr.name === 'AccessControlListNotSupported' ||
        aclErr.Code === 'AccessControlListNotSupported' ||
        (aclErr.message && aclErr.message.includes('ACL'))) {
      console.warn('[SPACES_SERVICE] ACL not supported on this bucket, uploading without ACL...');
      await s3.send(new PutObjectCommand(params));
    } else {
      console.error(`[SPACES_SERVICE] Upload failed for key ${key}:`, aclErr.message, aclErr.name, aclErr.$metadata?.httpStatusCode);
      throw aclErr;
    }
  }

  console.log(`[SPACES_SERVICE] ✓ Uploaded successfully: ${key}`);
  return { key, url: buildPublicUrl(key), size: body.length };
}

/**
 * Upload a buffer/stream to Spaces with an explicit key (no auto key building).
 * Used for profile photos and other non-inventory uploads.
 * @param {string} key - Full key path in the bucket
 * @param {Buffer} body
 * @param {string} contentType
 * @param {string} acl - ACL string (default: 'public-read')
 * @returns {{ key, url, size }}
 */
async function uploadRaw(key, body, contentType, acl = 'public-read') {
  console.log(`[SPACES_SERVICE] Uploading raw: Bucket=${BUCKET}, Key=${key}, Size=${body.length}, Type=${contentType}`);

  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  };

  try {
    await s3.send(new PutObjectCommand({ ...params, ACL: acl }));
  } catch (aclErr) {
    if (aclErr.name === 'AccessControlListNotSupported' ||
        aclErr.Code === 'AccessControlListNotSupported' ||
        (aclErr.message && aclErr.message.includes('ACL'))) {
      console.warn('[SPACES_SERVICE] ACL not supported, uploading without ACL...');
      await s3.send(new PutObjectCommand(params));
    } else {
      throw aclErr;
    }
  }

  console.log(`[SPACES_SERVICE] ✓ Uploaded raw successfully: ${key}`);
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
    // Note: ACL removed — not all DO Spaces configs support canned ACLs
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
        const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic', '.heif', '.tiff', '.tif', '.avif'].includes(ext);
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
  uploadRaw,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  listFiles,
  deleteFile,
  headFile,
  testConnection,
};
