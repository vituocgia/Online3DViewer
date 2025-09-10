export class CacheManager {
    constructor() {
        this.cacheName = '3d-viewer-cache-v1';
        this.maxCacheSize = 150 * 1024 * 1024; // 150MB
        this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.isServiceWorkerSupported = 'serviceWorker' in navigator;
        this.isCacheSupported = 'caches' in window && 'Cache' in window;

        // Check if we're in a secure context (HTTPS or localhost)
        this.isSecureContext = window.isSecureContext;

        console.log('CacheManager initialized:');
        console.log('- Cache API supported:', this.isCacheSupported);
        console.log('- Service Worker supported:', this.isServiceWorkerSupported);
        console.log('- Secure context:', this.isSecureContext);
    }

    // Initialize cache manager
    async init() {
        console.log('Initializing CacheManager...');

        if (!this.isCacheSupported) {
            console.warn('Cache API not supported in this browser');
            if (!this.isSecureContext) {
                console.warn('Cache API requires HTTPS or localhost. Current context is not secure.');
            }
            return false;
        }

        if (!this.isSecureContext) {
            console.warn('Cache API requires secure context (HTTPS or localhost)');
            return false;
        }

        if (this.isServiceWorkerSupported) {
            try {
                const registration = await navigator.serviceWorker.register('/tools/lib/service-worker.js');
                console.log('Service Worker registered:', registration);
                return true;
            } catch (error) {
                console.error('Service Worker registration failed:', error);
                // Continue without service worker
                return true;
            }
        }

        console.log('CacheManager initialized successfully (without Service Worker)');
        return true;
    }

    // Cache a 3D file with optional authorization token
    async cacheFile(url, fileData = null, authToken = null) {
        if (!this.isCacheSupported) return false;

        try {
            const cache = await caches.open(this.cacheName);

            let response;
            if (fileData) {
                // If fileData is provided, create response from it
                response = new Response(fileData, {
                    headers: {
                        'Content-Type': this.getContentType(url),
                        'sw-cache-time': new Date().toISOString()
                    }
                });
            } else {
                // Fetch from network with optional authorization
                try {
                    const fetchOptions = {
                        mode: 'cors', // Try CORS first
                        credentials: 'omit' // Don't send credentials
                    };

                    // Add authorization header if token is provided
                    if (authToken) {
                        fetchOptions.headers = {
                            'Authorization': `Bearer ${authToken}`
                        };
                    }

                    const networkResponse = await fetch(url, fetchOptions);

                    if (!networkResponse.ok) {
                        throw new Error(`HTTP ${networkResponse.status}: ${networkResponse.statusText}`);
                    }

                    // Clone and add cache timestamp
                    const responseToCache = networkResponse.clone();
                    const headers = new Headers(responseToCache.headers);
                    headers.set('sw-cache-time', new Date().toISOString());

                    response = new Response(responseToCache.body, {
                        status: responseToCache.status,
                        statusText: responseToCache.statusText,
                        headers: headers
                    });
                } catch (fetchError) {
                    // If CORS fails, try without CORS (for same-origin requests)
                    if (fetchError.name === 'TypeError' && fetchError.message.includes('CORS')) {
                        console.log('CORS failed, trying same-origin request for:', url);
                        const fetchOptions = {
                            mode: 'no-cors'
                        };

                        // Add authorization header if token is provided
                        if (authToken) {
                            fetchOptions.headers = {
                                'Authorization': `Bearer ${authToken}`
                            };
                        }

                        const networkResponse = await fetch(url, fetchOptions);

                        // Clone and add cache timestamp
                        const responseToCache = networkResponse.clone();
                        const headers = new Headers(responseToCache.headers);
                        headers.set('sw-cache-time', new Date().toISOString());

                        response = new Response(responseToCache.body, {
                            status: responseToCache.status,
                            statusText: responseToCache.statusText,
                            headers: headers
                        });
                    } else {
                        throw fetchError;
                    }
                }
            }

            await cache.put(url, response);
            console.log('Cached file:', url);

            // Clean up old entries if cache is too large
            await this.cleanupCache();

            return true;
        } catch (error) {
            console.error('Failed to cache file:', url, error);
            return false;
        }
    }

    // Get cached file
    async getCachedFile(url) {
        if (!this.isCacheSupported) return null;

        try {
            const cache = await caches.open(this.cacheName);
            const response = await cache.match(url);

            if (response) {
                // Check if cache is still valid
                const cacheTime = new Date(response.headers.get('sw-cache-time'));
                const now = new Date();

                if (now - cacheTime < this.cacheExpiry) {
                    console.log('Serving from cache:', url);
                    return response;
                } else {
                    // Cache expired, remove it
                    await cache.delete(url);
                    console.log('Cache expired, removed:', url);
                }
            }

            return null;
        } catch (error) {
            console.error('Failed to get cached file:', url, error);
            return null;
        }
    }

    // Preload and cache a 3D file with optional authorization token
    async preloadFile(url, authToken = null) {
        console.log('Preloading file:', url, authToken ? '(with auth token)' : '(no auth token)');

        if (!this.isCacheSupported) {
            console.error('Cache API not supported in this browser');
            throw new Error('Cache API not supported. This feature requires a modern browser with Cache API support.');
        }

        if (!this.isSecureContext) {
            console.error('Cache API requires secure context (HTTPS or localhost)');
            throw new Error('Cache API requires secure context. Please use HTTPS or localhost instead of HTTP.');
        }

        // Check if already cached
        const cached = await this.getCachedFile(url);
        if (cached) {
            console.log('File already cached:', url);
            return true;
        }

        // Cache the file
        try {
            const success = await this.cacheFile(url, null, authToken);
            if (success) {
                console.log('File preloaded successfully:', url);
                return true;
            } else {
                console.error('Failed to cache file:', url);
                return false;
            }
        } catch (error) {
            console.error('Error preloading file:', url, error);
            throw error; // Re-throw to let the caller handle it
        }
    }

    // Cache multiple files
    async cacheFiles(urls) {
        const results = [];
        for (const url of urls) {
            const success = await this.cacheFile(url);
            results.push({ url, success });
        }
        return results;
    }

    // Clear all cached files
    async clearCache() {
        if (!this.isCacheSupported) return false;

        try {
            await caches.delete(this.cacheName);
            console.log('Cache cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear cache:', error);
            return false;
        }
    }

    // Get cache status
    async getCacheStatus() {
        if (!this.isCacheSupported) return { size: 0, files: [] };

        try {
            const cache = await caches.open(this.cacheName);
            const requests = await cache.keys();

            const files = [];
            let totalSize = 0;

            for (const request of requests) {
                const response = await cache.match(request);
                if (response) {
                    const size = response.headers.get('content-length') || 0;
                    const cacheTime = response.headers.get('sw-cache-time');

                    files.push({
                        url: request.url,
                        size: parseInt(size),
                        cachedAt: cacheTime
                    });

                    totalSize += parseInt(size);
                }
            }

            return {
                size: totalSize,
                fileCount: files.length,
                files: files
            };
        } catch (error) {
            console.error('Failed to get cache status:', error);
            return { size: 0, files: [] };
        }
    }

    // Clean up old cache entries
    async cleanupCache() {
        if (!this.isCacheSupported) return;

        try {
            const cache = await caches.open(this.cacheName);
            const requests = await cache.keys();

            // Remove expired entries
            for (const request of requests) {
                const response = await cache.match(request);
                if (response) {
                    const cacheTime = new Date(response.headers.get('sw-cache-time'));
                    const now = new Date();

                    if (now - cacheTime > this.cacheExpiry) {
                        await cache.delete(request);
                        console.log('Removed expired cache entry:', request.url);
                    }
                }
            }

            // Check cache size and remove oldest entries if too large
            const status = await this.getCacheStatus();
            if (status.size > this.maxCacheSize) {
                console.log('Cache too large, cleaning up...');

                // Sort files by cache time (oldest first)
                const sortedFiles = status.files.sort((a, b) =>
                    new Date(a.cachedAt) - new Date(b.cachedAt)
                );

                // Remove oldest files until under limit
                for (const file of sortedFiles) {
                    await cache.delete(file.url);
                    console.log('Removed old cache entry:', file.url);

                    const newStatus = await this.getCacheStatus();
                    if (newStatus.size <= this.maxCacheSize) {
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to cleanup cache:', error);
        }
    }

    // Get content type based on file extension or URL pattern
    getContentType(url) {
        // First try to get extension from URL
        const urlParts = url.split('?')[0]; // Remove query parameters
        const extension = urlParts.split('.').pop().toLowerCase();

        const contentTypes = {
            'glb': 'model/gltf-binary',
            'gltf': 'model/gltf+json',
            'obj': 'text/plain',
            'fbx': 'application/octet-stream',
            'dae': 'text/xml',
            '3ds': 'application/octet-stream',
            'ply': 'text/plain',
            'stl': 'application/octet-stream',
            'wrl': 'model/vrml',
            'x3d': 'model/x3d+xml',
            'bin': 'application/octet-stream',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'ktx': 'image/ktx',
            'ktx2': 'image/ktx2',
            'dds': 'image/vnd.ms-dds',
            'hdr': 'image/vnd.radiance'
        };

        // If we have a valid extension, use it
        if (contentTypes[extension]) {
            return contentTypes[extension];
        }

        // For files without extension, try to detect from URL pattern
        if (url.includes('/model/') || url.includes('/models/') || url.includes('/3d/')) {
            return 'model/gltf-binary'; // Assume GLB for model URLs without extension
        }

        // Default fallback
        return 'application/octet-stream';
    }

    // Check if a file is cacheable
    isCacheable(url) {
        const cacheableExtensions = [
            '.glb', '.gltf', '.obj', '.fbx', '.dae', '.3ds', '.ply', '.stl', '.wrl', '.x3d',
            '.bin', '.jpg', '.png', '.jpeg', '.ktx', '.ktx2', '.dds', '.hdr'
        ];

        // Check for files with extensions
        if (cacheableExtensions.some(ext => url.toLowerCase().includes(ext))) {
            return true;
        }

        // Check for files without extensions that might be 3D models
        const urlLower = url.toLowerCase();
        if (urlLower.includes('/model/') || urlLower.includes('/models/') || urlLower.includes('/3d/')) {
            return true;
        }

        // Check for URLs that might be binary files (no extension but likely 3D models)
        if (urlLower.includes('model') || urlLower.includes('3d') || urlLower.includes('mesh')) {
            return true;
        }

        return false;
    }

    // Remove a specific file from cache
    async removeFile(url) {
        if (!this.isCacheSupported) return false;

        try {
            const cache = await caches.open(this.cacheName);
            const deleted = await cache.delete(url);

            if (deleted) {
                console.log('Removed file from cache:', url);
            } else {
                console.log('File not found in cache:', url);
            }

            return deleted;
        } catch (error) {
            console.error('Failed to remove file from cache:', url, error);
            return false;
        }
    }
}
