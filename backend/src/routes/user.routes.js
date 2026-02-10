const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');


// Any authenticated user can access these routes
router.use(auth);

router.get('/', userController.getAllUsers);

module.exports = router;
