const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const multer = require('multer');
const path = require('path');

// Media upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join('uploads', 'inventory'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// All routes require authentication
router.use(auth);

// Project routes
router.get('/projects', inventoryController.getProjects);
router.post('/projects', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), inventoryController.createProject);

// Tower routes
router.get('/projects/:projectId/towers', inventoryController.getTowers);
router.post('/projects/:projectId/towers', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), inventoryController.createTower);

// Inventory unit routes
router.get('/units/:id', inventoryController.getUnitById);
router.post('/units', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), inventoryController.createUnit);
router.put('/units/:id', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), inventoryController.updateUnit);

// Price history
router.post('/units/:id/price-history', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), inventoryController.addPriceHistory);

// Search & stats
router.get('/search', inventoryController.searchUnits);
router.get('/stats', inventoryController.getStats);

// Media upload routes
router.post('/units/:id/media', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), upload.array('files', 10), inventoryController.uploadUnitMedia);
router.get('/units/:id/media', inventoryController.getUnitMedia);
router.delete('/units/:id/media/:mediaId', role(['ADMIN', 'MANAGER', 'EMPLOYEE']), inventoryController.deleteUnitMedia);

// PDF Generation
router.get('/units/:id/pdf', inventoryController.generateUnitPDF);

module.exports = router;
