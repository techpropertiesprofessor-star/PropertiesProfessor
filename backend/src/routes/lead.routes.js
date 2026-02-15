const express = require('express');
const router = express.Router();

const leadController = require('../controllers/lead.controller');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const requirePermission = require('../middlewares/permission.middleware');
const multer = require('multer');
const path = require('path');


// ==================
// Multer setup
// ==================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join('uploads', 'leads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// ==================
// AUTH MIDDLEWARE
// ==================

// ==================
// ROUTES (ORDER FIXED)
// ==================
router.post('/upload', upload.single('file'), leadController.uploadLeads);

router.get('/uploads/history', leadController.getUploadHistory);


// Leads download (MANAGER/ADMIN only)
router.get('/download', auth, role(['MANAGER', 'ADMIN']), leadController.downloadLeadsCSV);

// GET /api/leads - requires Leads permission
router.get('/', auth, requirePermission('Leads'), leadController.getLeads);

router.post('/:id/assign', auth, role(['MANAGER', 'ADMIN']), leadController.assignLead);

// Comments
router.post('/:id/comments', leadController.addComment);
router.get('/:id/comments', leadController.getComments);

// Remarks update (both EMPLOYEE and MANAGER can update)
router.put('/:id/remarks', auth, requirePermission('Leads'), leadController.updateRemarks);

// CRUD
router.post('/', leadController.createLead); // <-- Add this line for manual lead creation
router.get('/:id', leadController.getLeadById);
router.put('/:id', leadController.updateLead);

module.exports = router;
exports.getUploadHistory = async (req, res, next) => {
  try {
    const uploads = await UploadHistory.find({}).sort({ uploadedAt: -1 });
    res.json(uploads);
  } catch (err) {
    next(err);
  }
};
