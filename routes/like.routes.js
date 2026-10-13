const express = require('express');
const router = express.Router();
const likeController = require('../controllers/like.controller');

router.post('/toggle', likeController.toggleLike);
router.get('/post/:postId/count', likeController.getLikesByPost);

module.exports = router;
