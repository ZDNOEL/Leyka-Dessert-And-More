const express = require('express');
const router = express.Router();
const pubController = require('../controllers/publicacion.controller');

// Obtener feed (publicaciones + productos)
router.get('/feed', pubController.getFeed);

// Crear publicación
router.post('/', pubController.createPublicacion);

// Comentarios
router.get('/:id_pub/comments', pubController.getComments);
router.post('/comments', pubController.addComment);

// Likes
router.post('/like', pubController.toggleLike);

// Editar y Eliminar Publicación
router.put('/:id_pub', pubController.updatePublicacion);
router.delete('/:id_pub', pubController.deletePublicacion);

module.exports = router;
