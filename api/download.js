const axios = require('axios');
const { fetch } = require('undici');
const stream = require('stream');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { videoId, itag, url: directUrl, quality, filename, proxy = false } = req.query;
        
        if (!videoId && !directUrl) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_PARAMS',
                message: 'Either videoId or direct URL is required'
            });
        }

        let downloadUrl = directUrl;
        let videoInfo = {};
        let suggestedFilename = 'video';

        // If videoId provided, get download URL from player API
        if (videoId && itag) {
            try {
                // Get player info to extract format URL
                const playerResponse = await axios.get(
                    `http://${req.headers.host}/api/player?videoId=${videoId}`,
                    { timeout: 10000 }
                );

                if (playerResponse.data.success) {
                    const formats = [
                        ...playerResponse.data.data.formats.video,
                        ...playerResponse.data.data.formats.audio
                    ];
                    
                    const format = formats.find(f => f.itag === parseInt(itag));
                    
                    if (!format || !format.url) {
                        throw new Error('Format not found');
                    }
                    
                    downloadUrl = format.url;
                    videoInfo = playerResponse.data.data.video;
                    suggestedFilename = sanitizeFilename(
                        filename || `${videoInfo.title || 'video'}_${format.quality || format.itag}`
                    );
                }
            } catch (playerError) {
                console.error('Failed to get player info:', playerError.message);
            }
        }

        if (!downloadUrl) {
            return res.status(404).json({
                success: false,
                error: 'DOWNLOAD_URL_NOT_FOUND',
                message: 'Could not find download URL'
            });
        }

        // Use proxy if requested
        if (proxy === 'true' && !downloadUrl.includes('cors.caliph.my.id')) {
            downloadUrl = `https://cors.caliph.my.id/${downloadUrl}`;
        }

        // Set headers for download
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
            'Range': req.headers.range || 'bytes=0-'
        };

        // Make the download request
        const response = await fetch(downloadUrl, { headers });
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }

        // Get content info
        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const contentDisposition = response.headers.get('content-disposition') || 
            `attachment; filename="${suggestedFilename}.${getFileExtension(contentType)}"`;

        // Set response headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', contentLength || 'unknown');
        res.setHeader('Content-Disposition', contentDisposition);
        res.setHeader('Accept-Ranges', 'bytes');
        
        if (response.headers.get('content-range')) {
            res.setHeader('Content-Range', response.headers.get('content-range'));
        }

        // Stream the response
        const readableStream = response.body;
        const passThrough = new stream.PassThrough();
        
        readableStream.pipe(passThrough);
        passThrough.pipe(res);

        // Handle stream errors
        passThrough.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: 'STREAM_ERROR',
                    message: 'Failed to stream download'
                });
            }
        });

    } catch (error) {
        console.error('Download API Error:', error.message);
        
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'DOWNLOAD_FAILED',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
};

// Helper functions
function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*]+/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 200)
        .trim();
}

function getFileExtension(contentType) {
    const extensions = {
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'audio/mp4': 'm4a',
        'audio/webm': 'webm',
        'audio/mpeg': 'mp3'
    };
    
    return extensions[contentType] || 'bin';
}
