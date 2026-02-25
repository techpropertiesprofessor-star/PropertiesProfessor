const express = require('express');
const router = express.Router();
const multer = require('multer');
const nasController = require('../controllers/nas.controller');
const authenticate = require('../middlewares/auth.middleware');
const requirePermission = require('../middlewares/permission.middleware');

// Multer: memory storage for DO Spaces upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB per file
});

// ─── Folder CRUD ──────────────────────────────────────────────────────

// List all folders
router.get('/folders', authenticate, requirePermission('NAS'), nasController.listFolders);

// Create a new folder
router.post('/folders', authenticate, requirePermission('NAS'), nasController.createFolder);

// Get a single folder (with files + download URLs)
router.get('/folders/:folderId', authenticate, requirePermission('NAS'), nasController.getFolder);

// Update folder name/description
router.put('/folders/:folderId', authenticate, requirePermission('NAS'), nasController.updateFolder);

// Delete a folder and all its files
router.delete('/folders/:folderId', authenticate, requirePermission('NAS'), nasController.deleteFolder);

// ─── File operations within a folder ─────────────────────────────────

// Upload files to a folder
router.post(
  '/folders/:folderId/files',
  authenticate,
  requirePermission('NAS'),
  upload.array('files', 20), // max 20 files at a time
  nasController.uploadFiles
);

// Delete a file from a folder
router.delete(
  '/folders/:folderId/files/:fileKey(*)',
  authenticate,
  requirePermission('NAS'),
  nasController.deleteFile
);

module.exports = router;
