require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const supabase = require('./utils/supabase');

// Import Routes
const donorRoutes = require('./routes/donorRoutes');
const requestRoutes = require('./routes/requestRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Socket.io Logic ---
// This allows the server to talk to the requester's browser in real-time
io.on('connection', (socket) => {
    socket.on('join-request-room', (email) => {
        socket.join(email);
    });
});

// Make 'io' accessible to our routes
app.set('socketio', io);

// --- Supabase Connection Check ---
(async () => {
    const { error } = await supabase.from('donors').select('id').limit(1);
    if (error) {
        console.error('❌ Supabase connection failed:', error.message);
        console.error('   Make sure you have run supabase_migration.sql and set correct credentials in .env');
        process.exit(1);
    }
    console.log('✅ Supabase connected successfully');
})();

// --- Routes ---
app.use('/api/donors', donorRoutes);
app.use('/api', requestRoutes);

// --- Global Error Handler (Express 5 compatible) ---
// Express 5 requires explicit 4-parameter signature for error middleware
app.use((err, req, res, _next) => {
    console.error('Server Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});