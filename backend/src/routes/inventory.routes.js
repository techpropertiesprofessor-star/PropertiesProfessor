const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const multer = require('multer');

// Media upload setup — use memory storage (files go to DO Spaces, not local disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|bmp|svg|heic|heif|tiff|tif|avif|mp4|mov|avi|mkv|webm|pdf/;
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${ext} not allowed`));
    }
  },
});

const requirePermission = require('../middlewares/permission.middleware');

// All routes require authentication + Inventory permission
router.use(auth);
router.use(requirePermission('Inventory'));

// ─── Batch thumbnails MUST be BEFORE any :id routes to prevent route collision ───
router.post('/thumbnails', inventoryController.getUnitThumbnails);
router.post('/units/thumbnails', inventoryController.getUnitThumbnails); // keep old path too

// Activity logs (managers/admin only)
router.get('/logs', role(['ADMIN', 'MANAGER']), inventoryController.getInventoryLogs);

// Project routes
router.get('/projects', inventoryController.getProjects);
router.post('/projects', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), inventoryController.createProject);

// Tower routes
router.get('/projects/:projectId/towers', inventoryController.getTowers);
router.post('/projects/:projectId/towers', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), inventoryController.createTower);

// Inventory unit routes
router.get('/units', inventoryController.listUnits);
router.get('/units/:id', inventoryController.getUnitById);
router.post('/units', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), inventoryController.createUnit);
router.put('/units/:id', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), inventoryController.updateUnit);

// Price history
router.post('/units/:id/price-history', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), inventoryController.addPriceHistory);

// Search & stats
router.get('/search', inventoryController.searchUnits);
router.get('/stats', inventoryController.getStats);

// Media upload routes — with multer error handling
router.post('/units/:id/media', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      console.error('[INVENTORY_ROUTE] Multer error:', err.message, err.code);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'File too large. Maximum size is 50MB per file.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: 'Too many files. Maximum 10 files per upload.' });
      }
      return res.status(400).json({ message: err.message || 'File upload error' });
    }
    next();
  });
}, inventoryController.uploadUnitMedia);
router.get('/units/:id/media', inventoryController.getUnitMedia);
router.delete('/units/:id/media/:mediaId', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), inventoryController.deleteUnitMedia);

// PDF Generation
router.get('/units/:id/pdf', inventoryController.generateUnitPDF);

module.exports = router;
