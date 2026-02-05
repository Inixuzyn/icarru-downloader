const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = process.env.VERCEL === '1';

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https://m.youtube.com", "https://www.youtube.com"]
        }
    }
}));
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public'), {
    maxAge: IS_VERCEL ? '1y' : '1d',
    etag: true
}));

// API Routes
app.use('/api/search', require('./api/search'));
app.use('/api/player', require('./api/player'));
app.use('/api/download', require('./api/download'));
app.use('/api/formats', require('./api/formats'));

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

app.get('/player', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'player.html'));
});

app.get('/formats', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'formats.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Icaru Downloader',
        version: '2.0.0'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found'
    });
});

// Start server only if not on Vercel
if (!IS_VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
        const localIP = getLocalIP();
        console.log(`
╔══════════════════════════════════════════════════════════╗
║                  🚀 ICARU DOWNLOADER                     ║
║                   v2.0.0 - Started!                      ║
╟──────────────────────────────────────────────────────────╢
║ 📍 Local:      http://localhost:${PORT}                  ║
║ 🌐 Network:    http://${localIP}:${PORT}                 ║
║ ⏰ Time:       ${new Date().toLocaleTimeString()}        ║
║ 📦 Environment: ${process.env.NODE_ENV || 'development'} ║
╚══════════════════════════════════════════════════════════╝
        `);
    });
}

// Export for Vercel
module.exports = app;

function getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    
    for (const iface of Object.values(interfaces)) {
        for (const config of iface) {
            if (config.family === 'IPv4' && !config.internal) {
                return config.address;
            }
        }
    }
    return '127.0.0.1';
}
