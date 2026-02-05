/**
 * Icaru Downloader - Utility Functions
 * Version: 2.0.0
 */

class Utils {
    constructor() {
        this.baseUrl = window.location.origin;
        this.apiBase = '/api';
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0 || !bytes) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Format duration in seconds to HH:MM:SS or MM:SS
     */
    formatDuration(seconds) {
        if (!seconds || seconds === 0) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Format bitrate from bps to kbps/Mbps
     */
    formatBitrate(bitrate) {
        if (!bitrate) return 'N/A';
        
        if (bitrate >= 1000000) {
            return (bitrate / 1000000).toFixed(1) + ' Mbps';
        }
        return Math.round(bitrate / 1000) + ' kbps';
    }

    /**
     * Extract video ID from YouTube URL
     */
    extractVideoId(url) {
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

    /**
     * Validate YouTube URL
     */
    isValidYouTubeUrl(url) {
        const patterns = [
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
            /^[a-zA-Z0-9_-]{11}$/
        ];
        
        return patterns.some(pattern => pattern.test(url));
    }

    /**
     * Sanitize filename
     */
    sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*]+/g, '_')
            .replace(/\s+/g, '_')
            .substring(0, 200)
            .trim();
    }

    /**
     * Get file extension from MIME type
     */
    getFileExtension(mimeType) {
        const extensions = {
            'video/mp4': 'mp4',
            'video/webm': 'webm',
            'video/3gpp': '3gp',
            'video/x-msvideo': 'avi',
            'video/quicktime': 'mov',
            'audio/mp4': 'm4a',
            'audio/mpeg': 'mp3',
            'audio/webm': 'webm',
            'audio/ogg': 'ogg',
            'audio/wav': 'wav',
            'audio/x-wav': 'wav'
        };
        
        return extensions[mimeType?.split(';')[0]] || 'bin';
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (err) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }

    /**
     * Generate unique ID
     */
    generateId(length = 8) {
        return Math.random().toString(36).substr(2, length);
    }

    /**
     * Debounce function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Parse query parameters from URL
     */
    getQueryParams() {
        const params = {};
        const queryString = window.location.search.substring(1);
        const pairs = queryString.split('&');
        
        pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        });
        
        return params;
    }

    /**
     * Set query parameter in URL
     */
    setQueryParam(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.pushState({}, '', url);
    }

    /**
     * Remove query parameter from URL
     */
    removeQueryParam(key) {
        const url = new URL(window.location);
        url.searchParams.delete(key);
        window.history.pushState({}, '', url);
    }

    /**
     * Format number with commas
     */
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * Truncate text with ellipsis
     */
    truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Check if device is mobile
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Check if device is touch capable
     */
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Get current theme
     */
    getTheme() {
        return document.documentElement.getAttribute('data-theme') || 
               (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        return newTheme;
    }

    /**
     * Load theme from localStorage
     */
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.setTheme(savedTheme);
        }
    }

    /**
     * Show notification
     */
    showNotification(options) {
        const {
            title = 'Notification',
            message = '',
            type = 'info',
            duration = 5000,
            icon = true
        } = options;

        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notificationId = this.generateId();
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = `notification-${notificationId}`;
        
        notification.innerHTML = `
            ${icon ? `<div class="notification-icon"><i class="fas ${icons[type]}"></i></div>` : ''}
            <div class="notification-content">
                ${title ? `<div class="notification-title">${title}</div>` : ''}
                ${message ? `<div class="notification-message">${message}</div>` : ''}
            </div>
            <button class="notification-close" onclick="utils.removeNotification('${notificationId}')">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notificationId);
            }, duration);
        }

        return notificationId;
    }

    /**
     * Remove notification
     */
    removeNotification(id) {
        const notification = document.getElementById(`notification-${id}`);
        if (notification) {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        let overlay = document.getElementById('loadingOverlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        
        overlay.style.display = 'flex';
        return overlay;
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Format date
     */
    formatDate(date, format = 'relative') {
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        
        if (format === 'relative') {
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            const months = Math.floor(days / 30);
            const years = Math.floor(days / 365);
            
            if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
            if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
            if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
            if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            return 'Just now';
        }
        
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Download file
     */
    downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'download';
        link.target = '_blank';
        
        // Safari compatibility
        if (typeof link.download === 'undefined') {
            window.open(url, '_blank');
            return;
        }
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Share content
     */
    async shareContent(options) {
        const { title, text, url } = options;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    text,
                    url
                });
                return true;
            } catch (err) {
                console.log('Share cancelled:', err);
                return false;
            }
        }
        
        // Fallback: copy to clipboard
        const shareUrl = url || window.location.href;
        const shareText = `${title}\n${text}\n\n${shareUrl}`;
        
        if (await this.copyToClipboard(shareText)) {
            this.showNotification({
                title: 'Copied to clipboard',
                message: 'Share link copied to clipboard',
                type: 'success'
            });
            return true;
        }
        
        return false;
    }

    /**
     * Make API request with error handling
     */
    async apiRequest(endpoint, options = {}) {
        const {
            method = 'GET',
            data = null,
            headers = {},
            timeout = 15000
        } = options;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const requestOptions = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                signal: controller.signal
            };

            if (data && method !== 'GET') {
                requestOptions.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.apiBase}${endpoint}`, requestOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Request failed');
            }

            return result;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            throw error;
        }
    }

    /**
     * Validate email
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Generate random color
     */
    getRandomColor() {
        const colors = [
            '#6d28d9', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6',
            '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Create element with attributes
     */
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'textContent') {
                element.textContent = attributes[key];
            } else if (key === 'innerHTML') {
                element.innerHTML = attributes[key];
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
        
        return element;
    }

    /**
     * Storage wrapper with expiration
     */
    storage = {
        set: (key, value, ttl = null) => {
            const item = {
                value,
                expiry: ttl ? Date.now() + ttl : null
            };
            localStorage.setItem(key, JSON.stringify(item));
        },
        
        get: (key) => {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            if (item.expiry && Date.now() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        },
        
        remove: (key) => {
            localStorage.removeItem(key);
        },
        
        clear: () => {
            localStorage.clear();
        }
    };

    /**
     * Parse YouTube timestamp to seconds
     */
    parseTimestamp(timestamp) {
        if (!timestamp) return 0;
        
        const parts = timestamp.split(':');
        let seconds = 0;
        
        if (parts.length === 3) {
            seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
        } else if (parts.length === 2) {
            seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        } else if (parts.length === 1) {
            seconds = parseInt(parts[0]);
        }
        
        return seconds || 0;
    }
}

// Initialize utils globally
const utils = new Utils();
window.utils = utils;
