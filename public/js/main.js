/**
 * Icaru Downloader - Main Application
 * Version: 2.0.0
 */

class IcaruDownloader {
    constructor() {
        this.utils = window.utils || new Utils();
        this.currentVideo = null;
        this.searchResults = [];
        this.currentPage = 'home';
        this.init();
    }

    /**
     * Initialize application
     */
    init() {
        // Load saved theme
        this.utils.loadTheme();
        
        // Bind events
        this.bindEvents();
        
        // Load initial data
        this.loadInitialData();
        
        // Check URL parameters
        this.checkUrlParams();
        
        // Initialize service worker (PWA)
        this.initServiceWorker();
        
        console.log('🚀 Icaru Downloader initialized');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            const newTheme = this.utils.toggleTheme();
            const icon = document.querySelector('#themeToggle i');
            const text = document.querySelector('#themeToggle span');
            
            if (newTheme === 'dark') {
                icon.className = 'fas fa-moon';
                text.textContent = 'Dark';
            } else {
                icon.className = 'fas fa-sun';
                text.textContent = 'Light';
            }
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.showPage(page);
                
                // Update active state
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        // Footer links
        document.querySelectorAll('.footer-section a[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.showPage(page);
            });
        });

        // URL input and analyze
        const videoUrlInput = document.getElementById('videoUrl');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const pasteBtn = document.getElementById('pasteBtn');
        const searchToggle = document.getElementById('searchToggle');

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeVideo());
        }

        if (videoUrlInput) {
            videoUrlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.analyzeVideo();
            });
        }

        if (pasteBtn) {
            pasteBtn.addEventListener('click', async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    if (this.utils.isValidYouTubeUrl(text)) {
                        videoUrlInput.value = text;
                        this.utils.showNotification({
                            title: 'Pasted',
                            message: 'URL pasted from clipboard',
                            type: 'success'
                        });
                    } else {
                        this.utils.showNotification({
                            title: 'Invalid URL',
                            message: 'Clipboard does not contain a valid YouTube URL',
                            type: 'error'
                        });
                    }
                } catch (err) {
                    this.utils.showNotification({
                        title: 'Error',
                        message: 'Could not access clipboard',
                        type: 'error'
                    });
                }
            });
        }

        if (searchToggle) {
            searchToggle.addEventListener('click', () => {
                this.showPage('search');
                document.querySelector('.nav-link[data-page="search"]')?.click();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchVideos());
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchVideos();
            });
        }

        // Modal close
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('videoModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideModal();
            }
        });

        // Legal buttons
        document.getElementById('termsBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLegalModal('Terms of Service');
        });

        document.getElementById('privacyBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLegalModal('Privacy Policy');
        });

        document.getElementById('disclaimerBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLegalModal('Disclaimer');
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape to close modal
            if (e.key === 'Escape') {
                this.hideModal();
            }
            
            // Ctrl+K or Cmd+K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (this.currentPage !== 'search') {
                    this.showPage('search');
                }
                searchInput?.focus();
            }
        });

        // Window events
        window.addEventListener('beforeunload', (e) => {
            // Save current state
            this.saveState();
        });

        window.addEventListener('popstate', () => {
            this.checkUrlParams();
        });
    }

    /**
     * Load initial data
     */
    loadInitialData() {
        // Load saved search history
        const searchHistory = this.utils.storage.get('searchHistory') || [];
        
        // Load saved settings
        const settings = this.utils.storage.get('settings') || {};
        
        // Apply settings
        if (settings.theme) {
            this.utils.setTheme(settings.theme);
        }
    }

    /**
     * Check URL parameters
     */
    checkUrlParams() {
        const params = this.utils.getQueryParams();
        
        if (params.url) {
            document.getElementById('videoUrl').value = params.url;
            setTimeout(() => this.analyzeVideo(), 500);
        }
        
        if (params.search) {
            document.getElementById('searchInput').value = params.search;
            this.showPage('search');
            setTimeout(() => this.searchVideos(), 500);
        }
        
        if (params.page) {
            this.showPage(params.page);
        }
    }

    /**
     * Save application state
     */
    saveState() {
        const state = {
            currentPage: this.currentPage,
            searchQuery: document.getElementById('searchInput')?.value || '',
            videoUrl: document.getElementById('videoUrl')?.value || ''
        };
        
        this.utils.storage.set('appState', state, 3600000); // 1 hour
    }

    /**
     * Show page
     */
    showPage(pageName) {
        // Hide all pages
        const pages = ['home', 'search', 'formats', 'about'];
        pages.forEach(page => {
            const element = document.getElementById(`${page}Page`);
            if (element) element.style.display = 'none';
        });
        
        // Show requested page
        const pageElement = document.getElementById(`${pageName}Page`);
        if (pageElement) {
            pageElement.style.display = 'block';
            this.currentPage = pageName;
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Update URL
            this.utils.setQueryParam('page', pageName);
        }
        
        // Special handling for search page
        if (pageName === 'search') {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                setTimeout(() => searchInput.focus(), 100);
            }
        }
    }

    /**
     * Analyze video from URL
     */
    async analyzeVideo() {
        const urlInput = document.getElementById('videoUrl');
        const url = urlInput.value.trim();
        
        if (!url) {
            this.utils.showNotification({
                title: 'Error',
                message: 'Please enter a YouTube URL',
                type: 'error'
            });
            urlInput.focus();
            return;
        }
        
        const videoId = this.utils.extractVideoId(url);
        if (!videoId) {
            this.utils.showNotification({
                title: 'Invalid URL',
                message: 'Please enter a valid YouTube URL',
                type: 'error'
            });
            urlInput.focus();
            return;
        }
        
        // Show loading
        const loadingId = this.utils.showNotification({
            title: 'Analyzing Video',
            message: 'Getting video information...',
            type: 'info',
            duration: 0
        });
        
        try {
            // Get video info
            const response = await this.utils.apiRequest(`/player?videoId=${videoId}`);
            
            this.utils.removeNotification(loadingId);
            
            if (response.success) {
                this.currentVideo = response.data;
                this.showVideoModal(response.data);
            } else {
                throw new Error(response.message || 'Failed to analyze video');
            }
            
        } catch (error) {
            this.utils.removeNotification(loadingId);
            
            this.utils.showNotification({
                title: 'Analysis Failed',
                message: error.message,
                type: 'error'
            });
            
            console.error('Analyze error:', error);
        }
    }

    /**
     * Search YouTube videos
     */
    async searchVideos() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput.value.trim();
        
        if (!query) {
            this.utils.showNotification({
                title: 'Error',
                message: 'Please enter a search query',
                type: 'error'
            });
            searchInput.focus();
            return;
        }
        
        const limit = document.getElementById('searchLimit')?.value || 20;
        const sort = document.getElementById('searchSort')?.value || 'relevance';
        
        // Show loading
        const resultsContainer = document.getElementById('resultsContainer');
        const loadingElement = document.getElementById('loadingResults');
        const noResultsElement = document.getElementById('noResults');
        
        resultsContainer.innerHTML = '';
        loadingElement.style.display = 'block';
        noResultsElement.style.display = 'none';
        
        // Save to search history
        this.saveSearchHistory(query);
        
        try {
            const response = await this.utils.apiRequest('/search', {
                method: 'POST',
                data: { query, limit, sort }
            });
            
            loadingElement.style.display = 'none';
            
            if (response.success && response.data.videos.length > 0) {
                this.searchResults = response.data.videos;
                this.displaySearchResults(response.data.videos);
            } else {
                noResultsElement.style.display = 'block';
            }
            
        } catch (error) {
            loadingElement.style.display = 'none';
            
            this.utils.showNotification({
                title: 'Search Failed',
                message: error.message,
                type: 'error'
            });
            
            console.error('Search error:', error);
        }
    }

    /**
     * Display search results
     */
    displaySearchResults(videos) {
        const container = document.getElementById('resultsContainer');
        
        if (!videos || videos.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No videos found</h3>
                    <p>Try a different search term</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = videos.map(video => this.createVideoCard(video)).join('');
        
        // Add click events to video cards
        container.querySelectorAll('.video-card').forEach(card => {
            const videoId = card.dataset.videoId;
            card.addEventListener('click', () => this.showVideoInfo(videoId));
        });
    }

    /**
     * Create video card HTML
     */
    createVideoCard(video) {
        return `
            <div class="video-card" data-video-id="${video.id}">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail || '/public/images/placeholder.jpg'}" 
                         alt="${video.title}"
                         loading="lazy">
                    ${video.duration ? `
                        <div class="duration-badge">${video.duration}</div>
                    ` : ''}
                    ${video.isLive ? `
                        <div class="video-badges">
                            <div class="badge badge-live">LIVE</div>
                        </div>
                    ` : ''}
                </div>
                <div class="video-info">
                    <h4 class="video-title" title="${video.title}">
                        ${this.utils.truncateText(video.title, 60)}
                    </h4>
                    <div class="video-meta">
                        <span class="video-channel">
                            <i class="fas fa-user-circle"></i>
                            ${this.utils.truncateText(video.channel, 30)}
                        </span>
                        <span class="video-views">
                            <i class="fas fa-eye"></i>
                            ${video.views}
                        </span>
                    </div>
                    <div class="video-meta">
                        <span class="video-published">
                            <i class="far fa-clock"></i>
                            ${video.published || 'Unknown date'}
                        </span>
                    </div>
                    <div class="video-actions">
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); icaru.showVideoInfo('${video.id}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.open('${video.url}', '_blank')">
                            <i class="fas fa-external-link-alt"></i> Watch
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show video information modal
     */
    async showVideoInfo(videoId) {
        const loadingId = this.utils.showNotification({
            title: 'Loading',
            message: 'Getting video formats...',
            type: 'info',
            duration: 0
        });
        
        try {
            const response = await this.utils.apiRequest(`/player?videoId=${videoId}`);
            
            this.utils.removeNotification(loadingId);
            
            if (response.success) {
                this.currentVideo = response.data;
                this.showVideoModal(response.data);
            } else {
                throw new Error(response.message || 'Failed to load video info');
            }
            
        } catch (error) {
            this.utils.removeNotification(loadingId);
            
            this.utils.showNotification({
                title: 'Error',
                message: error.message,
                type: 'error'
            });
            
            console.error('Video info error:', error);
        }
    }

    /**
     * Show video modal with download options
     */
    showVideoModal(videoData) {
        const modal = document.getElementById('videoModal');
        const modalBody = modal.querySelector('.modal-body');
        
        if (!videoData) return;
        
        const { video, formats, downloadUrls } = videoData;
        
        // Create modal content
        modalBody.innerHTML = `
            <div class="video-modal-content">
                <div class="video-preview">
                    <div class="video-thumbnail-large">
                        <img src="${video.thumbnails[0]?.url || '/public/images/placeholder.jpg'}" 
                             alt="${video.title}">
                        <div class="video-overlay">
                            <div class="video-title-large">${video.title}</div>
                            <div class="video-meta-large">
                                <span><i class="fas fa-user"></i> ${video.channel}</span>
                                <span><i class="fas fa-clock"></i> ${this.utils.formatDuration(video.duration)}</span>
                                <span><i class="fas fa-eye"></i> ${this.utils.formatNumber(video.viewCount)} views</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="download-options">
                    <h4><i class="fas fa-download"></i> Download Options</h4>
                    
                    <div class="formats-section">
                        <h5><i class="fas fa-video"></i> Video Formats</h5>
                        <div class="formats-grid">
                            ${downloadUrls.video.map(format => `
                                <div class="format-option">
                                    <div class="format-header">
                                        <h6>${format.quality}</h6>
                                        <span class="format-size">${format.size}</span>
                                    </div>
                                    <div class="format-details">
                                        <span class="format-itag">ITAG: ${format.itag}</span>
                                        <button class="btn btn-primary btn-sm download-btn" 
                                                data-url="${format.url}"
                                                data-filename="${video.title}_${format.quality}">
                                            <i class="fas fa-download"></i> Download
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="formats-section">
                        <h5><i class="fas fa-music"></i> Audio Formats</h5>
                        <div class="formats-grid">
                            ${downloadUrls.audio.map(format => `
                                <div class="format-option">
                                    <div class="format-header">
                                        <h6>Audio</h6>
                                        <span class="format-size">${format.size}</span>
                                    </div>
                                    <div class="format-details">
                                        <span class="format-itag">ITAG: ${format.itag}</span>
                                        <button class="btn btn-primary btn-sm download-btn" 
                                                data-url="${format.url}"
                                                data-filename="${video.title}_audio">
                                            <i class="fas fa-download"></i> Download
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="video-actions">
                    <button class="btn btn-secondary" onclick="window.open('https://www.youtube.com/watch?v=${video.id}', '_blank')">
                        <i class="fab fa-youtube"></i> Watch on YouTube
                    </button>
                    <button class="btn btn-outline" onclick="icaru.shareVideo('${video.id}')">
                        <i class="fas fa-share"></i> Share
                    </button>
                </div>
            </div>
        `;
        
        // Add styles for modal
        this.addModalStyles();
        
        // Add download button events
        modalBody.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const url = btn.dataset.url;
                const filename = btn.dataset.filename;
                this.downloadVideo(url, filename);
            });
        });
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Add modal styles
     */
    addModalStyles() {
        if (document.getElementById('modal-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            .video-modal-content {
                animation: fadeIn 0.3s ease;
            }
            
            .video-thumbnail-large {
                position: relative;
                border-radius: var(--radius-lg);
                overflow: hidden;
                margin-bottom: var(--spacing-lg);
            }
            
            .video-thumbnail-large img {
                width: 100%;
                max-height: 300px;
                object-fit: cover;
            }
            
            .video-overlay {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(transparent, rgba(0,0,0,0.8));
                padding: var(--spacing-lg);
                color: white;
            }
            
            .video-title-large {
                font-size: 1.25rem;
                font-weight: 600;
                margin-bottom: var(--spacing-sm);
            }
            
            .video-meta-large {
                display: flex;
                gap: var(--spacing-lg);
                font-size: 0.875rem;
                opacity: 0.9;
            }
            
            .download-options {
                margin: var(--spacing-xl) 0;
            }
            
            .formats-section {
                margin-bottom: var(--spacing-xl);
            }
            
            .formats-section h5 {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
                margin-bottom: var(--spacing-md);
                padding-bottom: var(--spacing-sm);
                border-bottom: 2px solid var(--border-color);
            }
            
            .formats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: var(--spacing-md);
            }
            
            .format-option {
                background: var(--bg-secondary);
                border-radius: var(--radius-lg);
                padding: var(--spacing-md);
                transition: transform var(--transition-normal);
            }
            
            .format-option:hover {
                transform: translateY(-4px);
            }
            
            .format-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--spacing-sm);
            }
            
            .format-header h6 {
                margin: 0;
                font-size: 0.875rem;
            }
            
            .format-size {
                font-size: 0.75rem;
                color: var(--text-tertiary);
                background: var(--bg-tertiary);
                padding
