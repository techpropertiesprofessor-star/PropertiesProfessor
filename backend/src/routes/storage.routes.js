/**
 * Storage Routes — DigitalOcean Spaces
 *
 * POST   /api/storage/upload/:inventoryId     Upload files (multipart) to Spaces
 * GET    /api/storage/list/:inventoryId        List all files for an inventory unit
 * GET    /api/storage/download                 Get presigned download URL  ?key=...
 * DELETE /api/storage/delete                   Delete a file               ?key=...
 * POST   /api/storage/presign-upload           Get presigned PUT URL for direct browser upload
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middlewares/auth.middleware');
const spacesService = require('../services/spaces.service');

// Multer: store in memory (we forward buffer to Spaces)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|bmp|svg|mp4|mov|avi|mkv|webm|pdf/;
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${ext} not allowed`));
    }
  },
});

// All routes require authentication
router.use(auth);

// ─── Upload files to Spaces ──────────────────────────────────────────
router.post('/upload/:inventoryId', upload.array('files', 20), async (req, res) => {
  try {
    const { inventoryId } = req.params;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    const results = await Promise.all(
      req.files.map(file =>
        spacesService.uploadFile(
          inventoryId,
          file.originalname,
          file.buffer,
          file.mimetype
        )
      )
    );

    res.status(201).json({
      message: `${results.length} file(s) uploaded to DigitalOcean Spaces`,
      files: results,
    });
  } catch (err) {
    console.error('Spaces upload error:', err);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

// ─── List files for an inventory unit ────────────────────────────────
router.get('/list/:inventoryId', async (req, res) => {
  try {
    const { inventoryId } = req.params;
    const files = await spacesService.listFiles(inventoryId);
    res.json({ inventoryId, count: files.length, files });
  } catch (err) {
    console.error('Spaces list error:', err);
    res.status(500).json({ message: 'Failed to list files', error: err.message });
  }
});

// ─── Get presigned download URL ──────────────────────────────────────
router.get('/download', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ message: 'key query param required' });
    const downloadUrl = await spacesService.getPresignedDownloadUrl(key, 3600);
    res.json({ downloadUrl, key });
  } catch (err) {
    console.error('Spaces download URL error:', err);
    res.status(500).json({ message: 'Failed to generate download URL', error: err.message });
  }
});

// ─── Delete a file ───────────────────────────────────────────────────
router.delete('/delete', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ message: 'key query param required' });
    await spacesService.deleteFile(key);
    res.json({ message: 'File deleted', key });
  } catch (err) {
    console.error('Spaces delete error:', err);
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
});

// ─── Presigned upload URL (for direct browser upload) ────────────────
router.post('/presign-upload', async (req, res) => {
  try {
    const { inventoryId, filename, contentType } = req.body;
    if (!inventoryId || !filename || !contentType) {
      return res.status(400).json({ message: 'inventoryId, filename, contentType required' });
    }
    const result = await spacesService.getPresignedUploadUrl(inventoryId, filename, contentType);
    res.json(result);
  } catch (err) {
    console.error('Spaces presign error:', err);
    res.status(500).json({ message: 'Presign failed', error: err.message });
  }
});

module.exports = router;
