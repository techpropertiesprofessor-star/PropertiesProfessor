const express = require('express');
const router = express.Router();
const callerController = require('../controllers/caller.controller');
const auth = require('../middlewares/auth.middleware');

router.use(auth);

router.post('/', callerController.createCaller);
router.get('/', callerController.getCallers);
router.put('/:id', callerController.updateCaller);
router.delete('/:id', callerController.deleteCaller);

module.exports = router;
