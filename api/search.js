const axios = require('axios');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { query, limit = 20, page = 1 } = req.method === 'POST' ? req.body : req.query;
        
        if (!query || query.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'INVALID_QUERY',
                message: 'Search query is required'
            });
        }

        // YouTube API headers
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
            'X-YouTube-Client-Name': '1',
            'X-YouTube-Client-Version': '2.20240101.00.00',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://m.youtube.com',
            'Referer': 'https://m.youtube.com/'
        };

        const body = {
            context: {
                client: {
                    hl: 'en',
                    gl: 'US',
                    clientName: 'MWEB',
                    clientVersion: '2.20240101.00.00',
                    platform: 'MOBILE'
                }
            },
            query: query.trim(),
            params: 'EgIQAQ%3D%3D' // Only videos
        };

        const response = await axios.post(
            'https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
            body,
            { 
                headers,
                timeout: 10000 
            }
        );

        const data = response.data;
        const videos = [];
        
        // Parse search results
        const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
        
        for (const item of contents) {
            if (videos.length >= limit) break;
            
            const videoRenderer = item.videoRenderer;
            if (!videoRenderer || !videoRenderer.videoId) continue;
            
            const thumbnails = videoRenderer.thumbnail?.thumbnails || [];
            const highestThumbnail = thumbnails[thumbnails.length - 1] || {};
            
            videos.push({
                id: videoRenderer.videoId,
                title: videoRenderer.title?.runs?.[0]?.text || 'No title',
                channel: videoRenderer.ownerText?.runs?.[0]?.text || videoRenderer.longBylineText?.runs?.[0]?.text || 'Unknown',
                channelId: videoRenderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || null,
                views: videoRenderer.viewCountText?.simpleText || '0 views',
                duration: videoRenderer.lengthText?.simpleText || null,
                published: videoRenderer.publishedTimeText?.simpleText || null,
                thumbnail: highestThumbnail.url || null,
                thumbnailWidth: highestThumbnail.width || 480,
                thumbnailHeight: highestThumbnail.height || 360,
                isLive: videoRenderer.badges?.some(b => b.metadataBadgeRenderer?.label === 'LIVE'),
                url: `https://www.youtube.com/watch?v=${videoRenderer.videoId}`
            });
        }

        res.status(200).json({
            success: true,
            data: {
                query: query.trim(),
                total: videos.length,
                page: parseInt(page),
                limit: parseInt(limit),
                videos,
                timestamp: new Date().toISOString()
            },
            meta: {
                service: 'Icaru Downloader',
                version: '2.0.0',
                cached: false
            }
        });

    } catch (error) {
        console.error('Search API Error:', error.message);
        
        // Detailed error response
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
        
        res.status(statusCode).json({
            success: false,
            error: 'SEARCH_FAILED',
            message: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
    }
};
