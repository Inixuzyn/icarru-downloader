const { fetch } = require('undici');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_URL',
                message: 'YouTube URL is required'
            });
        }

        // Extract video ID from URL
        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_URL',
                message: 'Invalid YouTube URL'
            });
        }

        // Use player API to get formats
        const playerResponse = await fetch(
            `http://${req.headers.host}/api/player?videoId=${videoId}`
        );
        
        if (!playerResponse.ok) {
            throw new Error('Failed to get video formats');
        }

        const playerData = await playerResponse.json();
        
        if (!playerData.success) {
            throw new Error(playerData.message || 'Failed to get video formats');
        }

        // Format the response
        const formats = {
            video: playerData.data.formats.video.map(f => ({
                quality: f.quality,
                itag: f.itag,
                mimeType: f.mimeType,
                size: formatBytes(f.contentLength),
                fps: f.fps,
                bitrate: formatBitrate(f.bitrate),
                download: `/api/download?videoId=${videoId}&itag=${f.itag}`
            })),
            audio: playerData.data.formats.audio.map(f => ({
                itag: f.itag,
                mimeType: f.mimeType,
                size: formatBytes(f.contentLength),
                bitrate: formatBitrate(f.bitrate),
                download: `/api/download?videoId=${videoId}&itag=${f.itag}`
            }))
        };

        res.status(200).json({
            success: true,
            data: {
                videoId,
                title: playerData.data.video.title,
                thumbnail: playerData.data.video.thumbnails[0]?.url || null,
                duration: formatDuration(playerData.data.video.duration),
                formats,
                total: {
                    video: formats.video.length,
                    audio: formats.audio.length
                }
            },
            meta: {
                service: 'Icaru Downloader',
                version: '2.0.0',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Formats API Error:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'FORMATS_FAILED',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Helper functions
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatBitrate(bitrate) {
    if (!bitrate) return 'N/A';
    return Math.round(bitrate / 1000) + ' kbps';
}

function formatDuration(seconds) {
    if (!seconds) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
