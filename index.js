require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const postRoutes = require('./routes/post.routes');
const commentRoutes = require('./routes/comment.routes');
const likeRoutes = require('./routes/like.routes');
const messageRoutes = require('./routes/message.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const publicacionRoutes = require('./routes/publicacion.routes');
const checkoutRoutes = require('./routes/checkout.routes');
const { ensureProductInfrastructure } = require('./services/product-schema.service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.use('/api/auth', authRoutes);
app.use('/api/marketplace', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/publicaciones', publicacionRoutes);
app.use('/api/checkout', checkoutRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sistema_pasteles.html'));
});

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La imagen es demasiado pesada. Reduce la foto e intenta de nuevo.' });
  }

  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Algo salio mal en el servidor.' });
});

async function startServer() {
  try {
    await ensureProductInfrastructure();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo preparar la infraestructura de productos:', error);
    process.exit(1);
  }
}

startServer();
