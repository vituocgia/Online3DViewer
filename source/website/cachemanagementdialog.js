import { AddDiv, CreateDiv } from '../engine/viewer/domutils.js';
import { Loc } from '../engine/core/localization.js';
import { CacheManager } from './cachemanager.js';

export class CacheManagementDialog {
    constructor(cacheManager) {
        this.cacheManager = cacheManager;
        this.dialogDiv = null;
    }

    Show() {
        console.log('CacheManagementDialog.Show() called');
        try {
            this.CreateDialog();
            this.UpdateCacheStatus();
        } catch (error) {
            console.error('Error showing cache management dialog:', error);
            alert('Failed to show cache management dialog: ' + error.message);
        }
    }

    CreateDialog() {
        console.log('Creating cache management dialog...');

        // Remove existing dialog if any
        if (this.dialogDiv) {
            this.dialogDiv.remove();
        }

        // Create dialog container
        this.dialogDiv = AddDiv(document.body, 'ov_dialog_overlay');
        console.log('Dialog overlay created:', this.dialogDiv);

        // Create dialog content
        const dialogContent = AddDiv(this.dialogDiv, 'ov_dialog');
        dialogContent.style.width = '600px';
        dialogContent.style.maxHeight = '80vh';
        dialogContent.style.overflow = 'auto';

        // Dialog header
        const headerDiv = AddDiv(dialogContent, 'ov_dialog_header');
        AddDiv(headerDiv, 'ov_dialog_title', Loc('Cache Management'));

        // Close button
        const closeButton = AddDiv(headerDiv, 'ov_dialog_close_button', '×');
        closeButton.addEventListener('click', () => {
            this.Close();
        });

        // Dialog body
        const bodyDiv = AddDiv(dialogContent, 'ov_dialog_body');

        // Cache status section
        const statusSection = AddDiv(bodyDiv, 'ov_dialog_section');
        AddDiv(statusSection, 'ov_dialog_section_title', Loc('Cache Status'));

        this.statusDiv = AddDiv(statusSection, 'ov_dialog_section_content');
        this.statusDiv.innerHTML = '<p>Loading cache status...</p>';

        // Cache actions section
        const actionsSection = AddDiv(bodyDiv, 'ov_dialog_section');
        AddDiv(actionsSection, 'ov_dialog_section_title', Loc('Cache Actions'));

        const actionsDiv = AddDiv(actionsSection, 'ov_dialog_section_content');

        // Clear cache button
        const clearButton = AddDiv(actionsDiv, 'ov_button', Loc('Clear All Cache'));
        clearButton.addEventListener('click', () => {
            this.ClearCache();
        });

        // Local file cache section
        const localCacheSection = AddDiv(bodyDiv, 'ov_dialog_section');
        AddDiv(localCacheSection, 'ov_dialog_section_title', Loc('Local File Cache'));

        const localCacheDiv = AddDiv(localCacheSection, 'ov_dialog_section_content');

        // Local cache status
        this.localCacheStatusDiv = AddDiv(localCacheDiv, 'ov_dialog_section_content');
        this.localCacheStatusDiv.innerHTML = '<p>Loading local cache status...</p>';

        // Clear local cache button
        const clearLocalButton = AddDiv(localCacheDiv, 'ov_button', Loc('Clear Local File Cache'));
        clearLocalButton.addEventListener('click', () => {
            this.ClearLocalCache();
        });

        // Preload section
        const preloadSection = AddDiv(bodyDiv, 'ov_dialog_section');
        AddDiv(preloadSection, 'ov_dialog_section_title', Loc('Preload Files'));

        const preloadDiv = AddDiv(preloadSection, 'ov_dialog_section_content');

        // URL input for preloading
        const urlInput = AddDiv(preloadDiv, 'ov_dialog_input_container');
        const urlLabel = AddDiv(urlInput, 'ov_dialog_input_label', Loc('File URL:'));
        const urlField = AddDiv(urlInput, 'ov_dialog_input_field');
        const urlInputElement = document.createElement('input');
        urlInputElement.type = 'text';
        urlInputElement.placeholder = 'https://example.com/model.glb';
        urlInputElement.className = 'ov_dialog_text_input';
        urlField.appendChild(urlInputElement);

        // Authorization token input
        const tokenInput = AddDiv(preloadDiv, 'ov_dialog_input_container');
        const tokenLabel = AddDiv(tokenInput, 'ov_dialog_input_label', Loc('Authorization Token (optional):'));
        const tokenField = AddDiv(tokenInput, 'ov_dialog_input_field');
        const tokenInputElement = document.createElement('input');
        tokenInputElement.type = 'password';
        tokenInputElement.placeholder = 'Bearer token for protected files';
        tokenInputElement.className = 'ov_dialog_text_input';
        tokenField.appendChild(tokenInputElement);

        // Add requirements note
        const requirementsDiv = AddDiv(preloadDiv, 'ov_dialog_section_content');
        requirementsDiv.innerHTML = '<p style="font-size: 11px; color: #ff6b6b; margin-top: 10px;"><strong>⚠️ Requirements:</strong> HTTPS or localhost required for web caching. For local files, use the file browser instead. Authorization tokens are supported for protected files.</p>';

        // Add sample URLs for testing
        const sampleUrlsDiv = AddDiv(preloadDiv, 'ov_dialog_section_content');
        sampleUrlsDiv.innerHTML = '<p style="font-size: 12px; color: #666; margin-top: 10px;"><strong>Sample URLs for testing:</strong></p>';

        const sampleUrls = [
            'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
            'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.glb',
            'https://threejs.org/examples/models/gltf/LittlestTokyo/glTF/LittlestTokyo.gltf'
        ];

        sampleUrls.forEach(sampleUrl => {
            const sampleLink = document.createElement('a');
            sampleLink.href = '#';
            sampleLink.textContent = sampleUrl;
            sampleLink.style.display = 'block';
            sampleLink.style.fontSize = '11px';
            sampleLink.style.color = '#007bff';
            sampleLink.style.textDecoration = 'none';
            sampleLink.style.marginTop = '5px';
            sampleLink.addEventListener('click', (e) => {
                e.preventDefault();
                urlInputElement.value = sampleUrl;
            });
            sampleUrlsDiv.appendChild(sampleLink);
        });

        // Add examples for files without extensions
        const noExtExamplesDiv = AddDiv(preloadDiv, 'ov_dialog_section_content');
        noExtExamplesDiv.innerHTML = '<p style="font-size: 12px; color: #666; margin-top: 10px;"><strong>Examples for files without extensions:</strong></p>';

        const noExtExamples = [
            'https://api.example.com/models/12345',
            'https://cdn.example.com/3d/model123',
            'https://storage.example.com/mesh/abc123'
        ];

        noExtExamples.forEach(example => {
            const exampleLink = document.createElement('a');
            exampleLink.href = '#';
            exampleLink.textContent = example + ' (no extension)';
            exampleLink.style.display = 'block';
            exampleLink.style.fontSize = '11px';
            exampleLink.style.color = '#28a745';
            exampleLink.style.textDecoration = 'none';
            exampleLink.style.marginTop = '5px';
            exampleLink.addEventListener('click', (e) => {
                e.preventDefault();
                urlInputElement.value = example;
            });
            noExtExamplesDiv.appendChild(exampleLink);
        });

        // Preload button
        const preloadButton = AddDiv(preloadDiv, 'ov_button', Loc('Preload File'));
        preloadButton.addEventListener('click', () => {
            const url = urlInputElement.value.trim();
            const token = tokenInputElement.value.trim();
            if (url) {
                this.PreloadFile(url, token);
            }
        });

        // Cached files list
        const filesSection = AddDiv(bodyDiv, 'ov_dialog_section');
        AddDiv(filesSection, 'ov_dialog_section_title', Loc('Cached Files'));

        this.filesDiv = AddDiv(filesSection, 'ov_dialog_section_content');
        this.filesDiv.innerHTML = '<p>Loading cached files...</p>';

        // Close dialog when clicking overlay
        this.dialogDiv.addEventListener('click', (event) => {
            if (event.target === this.dialogDiv) {
                this.Close();
            }
        });
    }

        async UpdateCacheStatus() {
        try {
            const status = await this.cacheManager.getCacheStatus();

            const sizeMB = (status.size / (1024 * 1024)).toFixed(2);
            const fileCount = status.fileCount;

            this.statusDiv.innerHTML = `
                <p><strong>${Loc('Total Size:')}</strong> ${sizeMB} MB</p>
                <p><strong>${Loc('Files Cached:')}</strong> ${fileCount}</p>
                <p><strong>${Loc('Cache Status:')}</strong> <span style="color: green;">${Loc('Active')}</span></p>
            `;

            // Update files list
            this.UpdateFilesList(status.files);

            // Update local cache status if available
            if (window.website && window.website.enhancedModelLoader) {
                const localStatus = await window.website.enhancedModelLoader.getCacheStatus();
                const localSizeMB = (localStatus.size / (1024 * 1024)).toFixed(2);

                this.localCacheStatusDiv.innerHTML = `
                    <p><strong>${Loc('Local Files:')}</strong> ${localStatus.fileCount}</p>
                    <p><strong>${Loc('Local Cache Size:')}</strong> ${localSizeMB} MB</p>
                    <p><strong>${Loc('Status:')}</strong> <span style="color: green;">${Loc('Active')}</span></p>
                `;
            }
        } catch (error) {
            console.error('Failed to update cache status:', error);
            this.statusDiv.innerHTML = '<p style="color: red;">Failed to load cache status</p>';
        }
    }

    UpdateFilesList(files) {
        if (files.length === 0) {
            this.filesDiv.innerHTML = '<p>' + Loc('No files cached') + '</p>';
            return;
        }

        const filesList = AddDiv(this.filesDiv, 'ov_dialog_files_list');
        filesList.innerHTML = '';

        files.forEach(file => {
            const fileItem = AddDiv(filesList, 'ov_dialog_file_item');

            const fileName = file.url.split('/').pop() || file.url;
            const fileSize = (file.size / 1024).toFixed(1);
            const cacheDate = new Date(file.cachedAt).toLocaleDateString();

            fileItem.innerHTML = `
                <div class="ov_dialog_file_info">
                    <div class="ov_dialog_file_name">${fileName}</div>
                    <div class="ov_dialog_file_details">
                        ${fileSize} KB • ${Loc('Cached')}: ${cacheDate}
                    </div>
                </div>
                <button class="ov_dialog_file_remove" onclick="window.website.cacheManagementDialog.removeFile('${file.url}')">×</button>
            `;
        });
    }

    async ClearCache() {
        if (confirm(Loc('Are you sure you want to clear all cached files?'))) {
            try {
                await this.cacheManager.clearCache();
                this.UpdateCacheStatus();
                alert(Loc('Cache cleared successfully'));
            } catch (error) {
                console.error('Failed to clear cache:', error);
                alert(Loc('Failed to clear cache'));
            }
        }
    }

    async ClearLocalCache() {
        if (confirm(Loc('Are you sure you want to clear all local file cache?'))) {
            try {
                if (window.website && window.website.enhancedModelLoader) {
                    await window.website.enhancedModelLoader.clearCache();
                    this.UpdateCacheStatus();
                    alert(Loc('Local cache cleared successfully'));
                }
            } catch (error) {
                console.error('Failed to clear local cache:', error);
                alert(Loc('Failed to clear local cache'));
            }
        }
    }

        async PreloadFile(url, authToken = null) {
        if (!url || url.trim() === '') {
            alert('Please enter a valid URL');
            return;
        }

        try {
            console.log('Attempting to preload:', url, authToken ? '(with auth token)' : '(no auth token)');
            const success = await this.cacheManager.preloadFile(url, authToken);
            if (success) {
                this.UpdateCacheStatus();
                alert('File preloaded successfully! The file is now cached for faster loading.');
            } else {
                alert('Failed to preload file. This could be due to:\n• CORS restrictions (cross-origin)\n• Invalid URL\n• Network issues\n• File not accessible\n• Invalid authorization token\n\nTry using one of the sample URLs provided.');
            }
        } catch (error) {
            console.error('Failed to preload file:', error);
            let errorMessage = 'Failed to preload file: ';

            if (error.message.includes('Cache API not supported')) {
                errorMessage = 'Cache API not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.';
            } else if (error.message.includes('secure context')) {
                errorMessage = 'Cache API requires HTTPS or localhost. You are currently using HTTP. Please:\n\n1. Use HTTPS instead of HTTP\n2. Or access via localhost instead of IP address\n3. Or use the local file cache feature for local files';
            } else if (error.name === 'TypeError' && error.message.includes('CORS')) {
                errorMessage += 'CORS error - the file is on a different domain and not accessible.';
            } else if (error.message.includes('HTTP 401') || error.message.includes('HTTP 403')) {
                errorMessage += 'Authorization error - please check your token is valid and has permission to access this file.';
            } else if (error.message.includes('HTTP')) {
                errorMessage += `HTTP error: ${error.message}`;
            } else if (error.message.includes('fetch')) {
                errorMessage += 'Network error - check your internet connection.';
            } else {
                errorMessage += error.message;
            }

            alert(errorMessage);
        }
    }

    async removeFile(url) {
        try {
            const success = await this.cacheManager.removeFile(url);
            if (success) {
                this.UpdateCacheStatus();
                console.log('File removed from cache:', url);
            } else {
                console.error('Failed to remove file from cache:', url);
            }
        } catch (error) {
            console.error('Error removing file from cache:', error);
        }
    }

    Close() {
        if (this.dialogDiv) {
            this.dialogDiv.remove();
            this.dialogDiv = null;
        }
    }
}
