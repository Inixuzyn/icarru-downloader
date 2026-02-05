const axios = require('axios');
const { fetch } = require('undici');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { videoId, quality, type = 'both' } = req.method === 'POST' ? req.body : req.query;
        
        if (!videoId) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_VIDEO_ID',
                message: 'Video ID is required'
            });
        }

        // Validate video ID
        if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_VIDEO_ID',
                message: 'Invalid YouTube Video ID format'
            });
        }

        // First try: YouTubei API
        try {
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            };

            const body = {
                context: {
                    client: {
                        clientName: 'WEB',
                        clientVersion: '2.20240101.00.00',
                        hl: 'en',
                        gl: 'US'
                    }
                },
                videoId: videoId,
                playbackContext: {
                    contentPlaybackContext: {
                        signatureTimestamp: 20480
                    }
                },
                contentCheckOk: true,
                racyCheckOk: true
            };

            const response = await axios.post(
                'https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
                body,
                { 
                    headers,
                    timeout: 15000 
                }
            );

            const data = response.data;
            
            if (!data.videoDetails) {
                throw new Error('Video details not found');
            }

            // Extract video details
            const videoDetails = {
                id: data.videoDetails.videoId,
                title: data.videoDetails.title,
                channel: data.videoDetails.author,
                channelId: data.videoDetails.channelId,
                duration: parseInt(data.videoDetails.lengthSeconds),
                keywords: data.videoDetails.keywords || [],
                description: data.videoDetails.shortDescription || '',
                thumbnails: data.videoDetails.thumbnail?.thumbnails || [],
                isLive: data.videoDetails.isLiveContent || false,
                allowRatings: data.videoDetails.allowRatings || false,
                viewCount: data.videoDetails.viewCount || '0'
            };

            // Parse formats
            const streamingData = data.streamingData || {};
            const adaptiveFormats = streamingData.adaptiveFormats || [];
            const formats = streamingData.formats || [];
            const allFormats = [...formats, ...adaptiveFormats];

            // Categorize formats
            const videoFormats = [];
            const audioFormats = [];
            const combinedFormats = [];

            allFormats.forEach(format => {
                const formatInfo = {
                    itag: format.itag,
                    mimeType: format.mimeType || '',
                    bitrate: format.bitrate || 0,
                    contentLength: format.contentLength || 0,
                    url: format.url || '',
                    quality: format.qualityLabel || format.quality || '',
                    fps: format.fps || 0,
                    width: format.width || 0,
                    height: format.height || 0,
                    approxDurationMs: format.approxDurationMs || 0
                };

                // Add signature if exists
                if (format.signatureCipher) {
                    formatInfo.signatureCipher = format.signatureCipher;
                }

                // Categorize
                if (formatInfo.mimeType.includes('video')) {
                    videoFormats.push(formatInfo);
                } else if (formatInfo.mimeType.includes('audio')) {
                    audioFormats.push(formatInfo);
                }

                combinedFormats.push(formatInfo);
            });

            // Sort video formats by quality
            videoFormats.sort((a, b) => {
                const qualityOrder = ['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'];
                const aIndex = qualityOrder.indexOf(a.quality);
                const bIndex = qualityOrder.indexOf(b.quality);
                return bIndex - aIndex;
            });

            // Sort audio formats by bitrate
            audioFormats.sort((a, b) => b.bitrate - a.bitrate);

            // Get best format based on request
            let recommendedFormat = null;
            if (type === 'video' && videoFormats.length > 0) {
                recommendedFormat = videoFormats[0];
            } else if (type === 'audio' && audioFormats.length > 0) {
                recommendedFormat = audioFormats[0];
            } else if (combinedFormats.length > 0) {
                recommendedFormat = combinedFormats[0];
            }

            // Generate download URLs
            const generateDownloadUrl = (format) => {
                if (!format) return null;
                return `/api/download?videoId=${videoId}&itag=${format.itag}`;
            };

            res.status(200).json({
                success: true,
                data: {
                    video: videoDetails,
                    formats: {
                        video: videoFormats,
                        audio: audioFormats,
                        all: combinedFormats
                    },
                    recommended: recommendedFormat,
                    downloadUrls: {
                        video: videoFormats.map(f => ({
                            quality: f.quality,
                            itag: f.itag,
                            url: generateDownloadUrl(f),
                            size: formatBytes(f.contentLength)
                        })),
                        audio: audioFormats.map(f => ({
                            itag: f.itag,
                            url: generateDownloadUrl(f),
                            size: formatBytes(f.contentLength)
                        }))
                    },
                    streamingData: {
                        expiresInSeconds: streamingData.expiresInSeconds || 3600,
                        dashManifestUrl: streamingData.dashManifestUrl || null,
                        hlsManifestUrl: streamingData.hlsManifestUrl || null
                    }
                },
                meta: {
                    service: 'Icaru Downloader',
                    version: '2.0.0',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (apiError) {
            console.error('YouTube API Error:', apiError.message);
            throw new Error('Failed to fetch video information');
        }

    } catch (error) {
        console.error('Player API Error:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'PLAYER_FAILED',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
    }
};

// Helper function to format bytes
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
