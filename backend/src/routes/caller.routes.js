const express = require('express');
const router = express.Router();
const callerController = require('../controllers/caller.controller');
const auth = require('../middlewares/auth.middleware');
const requirePermission = require('../middlewares/permission.middleware');

router.use(auth);
router.use(requirePermission('Caller'));

router.post('/', callerController.createCaller);
router.get('/', callerController.getCallers);
router.put('/:id', callerController.updateCaller);
router.delete('/:id', callerController.deleteCaller);

module.exports = router;
