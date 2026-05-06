const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const dotenv     = require('dotenv');
const connectDB  = require('./config/db');

// ✅ Swagger (SAFE LOAD)
let swaggerUi, YAML, path, swaggerDocument;

try {
  swaggerUi = require('swagger-ui-express');
  YAML = require('yamljs');
  path = require('path');

  swaggerDocument = YAML.load(path.join(__dirname, './config/swagger.yaml'));
  console.log('Swagger loaded successfully');
} catch (err) {
  console.error('Swagger failed to load:', err.message);
}

dotenv.config();
connectDB();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'], credentials: true }
});

// Export io
module.exports.io = io;

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ✅ Swagger route (ONLY if loaded)
if (swaggerUi && swaggerDocument) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// Routes
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/queues',  require('./routes/queues'));
app.use('/api/entries', require('./routes/entries'));
app.use('/api/admin',   require('./routes/admin'));

app.get('/', (req, res) => {
  if (swaggerUi && swaggerDocument) {
    return res.redirect('/api-docs');
  }
  return res.json({ message: 'BananaQueue API running' });
});

// Socket
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} with Socket.IO`));