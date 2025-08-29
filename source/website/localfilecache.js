export class LocalFileCache {
    constructor() {
        this.dbName = '3DViewerLocalCache';
        this.dbVersion = 1;
        this.storeName = 'files';
        this.maxCacheSize = 500 * 1024 * 1024; // 500MB for local files
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Local file cache initialized');
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store for files
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('size', 'size', { unique: false });
                    console.log('Created IndexedDB store for local files');
                }
            };
        });
    }

    // Generate unique ID for file
    generateFileId(file) {
        return `${file.name}_${file.size}_${file.lastModified}`;
    }

    // Cache a local file
    async cacheFile(file) {
        if (!this.db) {
            console.error('IndexedDB not initialized');
            return false;
        }

        const fileId = this.generateFileId(file);

        try {
            // Check if file is already cached
            const existing = await this.getCachedFile(fileId);
            if (existing) {
                console.log('File already cached:', file.name);
                return true;
            }

            // Read file as ArrayBuffer for efficient storage
            const arrayBuffer = await this.readFileAsArrayBuffer(file);

            // Store in IndexedDB
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const fileData = {
                id: fileId,
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                timestamp: Date.now(),
                data: arrayBuffer
            };

            await new Promise((resolve, reject) => {
                const request = store.add(fileData);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            console.log('Cached local file:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

            // Clean up old files if cache is too large
            await this.cleanupCache();

            return true;
        } catch (error) {
            console.error('Failed to cache file:', file.name, error);
            return false;
        }
    }

    // Get cached file
    async getCachedFile(fileId) {
        if (!this.db) return null;

        try {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            return new Promise((resolve, reject) => {
                const request = store.get(fileId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get cached file:', error);
            return null;
        }
    }

    // Read file as ArrayBuffer
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    // Get cache status
    async getCacheStatus() {
        if (!this.db) return { size: 0, files: [] };

        try {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const files = request.result;
                    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

                    resolve({
                        size: totalSize,
                        fileCount: files.length,
                        files: files.map(file => ({
                            id: file.id,
                            name: file.name,
                            size: file.size,
                            timestamp: file.timestamp,
                            lastModified: file.lastModified
                        }))
                    });
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get cache status:', error);
            return { size: 0, files: [] };
        }
    }

    // Clear all cached files
    async clearCache() {
        if (!this.db) return false;

        try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            console.log('Local file cache cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear cache:', error);
            return false;
        }
    }

    // Clean up old files when cache is too large
    async cleanupCache() {
        if (!this.db) return;

        try {
            const status = await this.getCacheStatus();
            if (status.size <= this.maxCacheSize) return;

            console.log('Cache too large, cleaning up...');

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('timestamp');

            // Get all files sorted by timestamp (oldest first)
            const files = await new Promise((resolve, reject) => {
                const request = index.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            // Remove oldest files until under limit
            for (const file of files) {
                await new Promise((resolve, reject) => {
                    const request = store.delete(file.id);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });

                console.log('Removed old cached file:', file.name);

                const newStatus = await this.getCacheStatus();
                if (newStatus.size <= this.maxCacheSize) {
                    break;
                }
            }
        } catch (error) {
            console.error('Failed to cleanup cache:', error);
        }
    }

    // Remove specific file from cache
    async removeFile(fileId) {
        if (!this.db) return false;

        try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            await new Promise((resolve, reject) => {
                const request = store.delete(fileId);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            console.log('Removed file from cache:', fileId);
            return true;
        } catch (error) {
            console.error('Failed to remove file from cache:', error);
            return false;
        }
    }
}
