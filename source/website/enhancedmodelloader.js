import { LocalFileCache } from './localfilecache.js';
import { InputFilesFromFileObjects } from '../engine/import/importerfiles.js';
import { ImportSettings } from '../engine/import/importer.js';

export class EnhancedModelLoader {
    constructor() {
        this.localFileCache = new LocalFileCache();
        this.isInitialized = false;
        this.loadingProgress = 0;
        this.onProgressCallback = null;
    }

    async init() {
        if (this.isInitialized) return true;

        try {
            await this.localFileCache.init();
            this.isInitialized = true;
            console.log('Enhanced model loader initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize enhanced model loader:', error);
            return false;
        }
    }

    // Set progress callback
    setProgressCallback(callback) {
        this.onProgressCallback = callback;
    }

    // Update progress
    updateProgress(progress) {
        this.loadingProgress = progress;
        if (this.onProgressCallback) {
            this.onProgressCallback(progress);
        }
    }

    // Load model with caching
    async loadModelWithCache(files, settings, callbacks) {
        console.log('Enhanced model loader: loadModelWithCache called with', files.length, 'files');

        if (!this.isInitialized) {
            console.log('Enhanced model loader: Initializing...');
            await this.init();
        }

        this.updateProgress(0);

        try {
            // Check if files are cached
            console.log('Enhanced model loader: Checking cache...');
            const cachedFiles = await this.getCachedFiles(files);
            console.log('Enhanced model loader: Found', cachedFiles.length, 'cached files out of', files.length);

            if (cachedFiles.length === files.length) {
                console.log('All files found in cache, loading from cache...');
                this.updateProgress(50);

                // Load from cache
                const inputFiles = await this.createInputFilesFromCache(cachedFiles);
                this.updateProgress(75);

                // Call the original loader with cached files
                if (callbacks.onFinish) {
                    callbacks.onFinish(inputFiles, settings);
                }

                this.updateProgress(100);
                return;
            }

            // Some or no files cached, load and cache them
            console.log('Loading files and caching for future use...');

            // Cache files first
            await this.cacheFiles(files);
            this.updateProgress(25);

            // Create input files
            const inputFiles = InputFilesFromFileObjects(files);
            this.updateProgress(50);

            // Call the original loader
            if (callbacks.onFinish) {
                callbacks.onFinish(inputFiles, settings);
            }

            this.updateProgress(100);

        } catch (error) {
            console.error('Error in enhanced model loader:', error);
            this.updateProgress(0);

            // Fallback to original loading method
            const inputFiles = InputFilesFromFileObjects(files);
            if (callbacks.onFinish) {
                callbacks.onFinish(inputFiles, settings);
            }
        }
    }

    // Cache multiple files
    async cacheFiles(files) {
        const totalFiles = files.length;
        let cachedCount = 0;

        for (const file of files) {
            try {
                const success = await this.localFileCache.cacheFile(file);
                if (success) {
                    cachedCount++;
                }

                // Update progress
                const progress = (cachedCount / totalFiles) * 25; // 0-25% for caching
                this.updateProgress(progress);

            } catch (error) {
                console.error('Failed to cache file:', file.name, error);
            }
        }

        console.log(`Cached ${cachedCount}/${totalFiles} files`);
    }

    // Get cached files
    async getCachedFiles(files) {
        const cachedFiles = [];

        for (const file of files) {
            const fileId = this.localFileCache.generateFileId(file);
            const cachedFile = await this.localFileCache.getCachedFile(fileId);

            if (cachedFile) {
                cachedFiles.push(cachedFile);
            }
        }

        return cachedFiles;
    }

    // Create input files from cached data
    async createInputFilesFromCache(cachedFiles) {
        const inputFiles = [];

        for (const cachedFile of cachedFiles) {
            // Convert ArrayBuffer back to File object
            const file = new File([cachedFile.data], cachedFile.name, {
                type: cachedFile.type,
                lastModified: cachedFile.lastModified
            });

            inputFiles.push(file);
        }

        return inputFiles;
    }

    // Get cache status
    async getCacheStatus() {
        if (!this.isInitialized) {
            await this.init();
        }
        return await this.localFileCache.getCacheStatus();
    }

    // Clear cache
    async clearCache() {
        if (!this.isInitialized) {
            await this.init();
        }
        return await this.localFileCache.clearCache();
    }

    // Preload specific files
    async preloadFiles(files) {
        if (!this.isInitialized) {
            await this.init();
        }

        console.log('Preloading files for faster future loading...');
        await this.cacheFiles(files);
        console.log('Preloading completed');
    }

    // Check if files are cached
    async areFilesCached(files) {
        if (!this.isInitialized) {
            await this.init();
        }

        const cachedFiles = await this.getCachedFiles(files);
        return cachedFiles.length === files.length;
    }

    // Get cache hit ratio
    async getCacheHitRatio() {
        if (!this.isInitialized) {
            await this.init();
        }

        const status = await this.getCacheStatus();
        return {
            totalFiles: status.fileCount,
            totalSize: status.size,
            cacheSizeMB: (status.size / 1024 / 1024).toFixed(2)
        };
    }
}
