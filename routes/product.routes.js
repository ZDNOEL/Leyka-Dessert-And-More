const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { verifyToken, isSeller } = require('../middleware/auth.middleware');

// Public route to get all products for the marketplace/catalog
router.get('/', productController.getAllProducts);
router.get('/:id/reviews', productController.getProductReviews);
router.post('/:id/reviews', verifyToken, productController.upsertProductReview);

// Protected routes
router.get('/seller/:sellerId', verifyToken, productController.getSellerProducts);
router.get('/stats/:sellerId', verifyToken, isSeller, productController.getSellerStats);
router.post('/seller/:sellerId', verifyToken, isSeller, productController.createProduct);
router.put('/:id', verifyToken, isSeller, productController.updateProduct);
router.delete('/:id', verifyToken, isSeller, productController.deleteProduct);

module.exports = router;
