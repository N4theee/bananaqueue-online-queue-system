    const express = require('express');
    const cors = require('cors');
    const dotenv = require('dotenv');
    const connectDB = require('./config/db');

    dotenv.config();
    connectDB();

    const app = express();
    app.use(cors({
    origin: 'http://localhost:5173',  // Vite's default port
    credentials: true
    }));
    app.use(express.json());

    // Routes
    app.use('/api/auth',    require('./routes/auth'));
    app.use('/api/queues',  require('./routes/queues'));
    app.use('/api/entries', require('./routes/entries'));
    app.use('/api/admin',   require('./routes/admin'));

    app.get('/', (req, res) => res.json({ message: 'BananaQueue API running' }));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));