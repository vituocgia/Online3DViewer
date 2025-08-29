import { AddDiv, ShowDomElement } from '../engine/viewer/domutils.js';
import { Loc } from '../engine/core/localization.js';

export class LoadingProgress {
    constructor() {
        this.progressDiv = null;
        this.progressBar = null;
        this.progressText = null;
        this.isVisible = false;
    }

    show() {
        if (this.isVisible) return;

        this.createProgressUI();
        this.isVisible = true;
    }

    hide() {
        if (!this.isVisible) return;

        if (this.progressDiv) {
            this.progressDiv.remove();
            this.progressDiv = null;
            this.progressBar = null;
            this.progressText = null;
        }

        this.isVisible = false;
    }

    createProgressUI() {
        // Create overlay
        this.progressDiv = AddDiv(document.body, 'ov_loading_progress_overlay');

        // Create progress container
        const progressContainer = AddDiv(this.progressDiv, 'ov_loading_progress_container');

        // Create title
        const title = AddDiv(progressContainer, 'ov_loading_progress_title', Loc('Loading Large File'));

        // Create progress bar container
        const progressBarContainer = AddDiv(progressContainer, 'ov_loading_progress_bar_container');

        // Create progress bar
        this.progressBar = AddDiv(progressBarContainer, 'ov_loading_progress_bar');

        // Create progress text
        this.progressText = AddDiv(progressContainer, 'ov_loading_progress_text', '0%');

        // Create status text
        this.statusText = AddDiv(progressContainer, 'ov_loading_progress_status', Loc('Initializing...'));

        // Create cancel button
        const cancelButton = AddDiv(progressContainer, 'ov_loading_progress_cancel', Loc('Cancel'));
        cancelButton.addEventListener('click', () => {
            this.hide();
        });
    }

    updateProgress(progress, status = '') {
        if (!this.isVisible || !this.progressBar) return;

        // Update progress bar
        this.progressBar.style.width = `${progress}%`;

        // Update progress text
        if (this.progressText) {
            this.progressText.textContent = `${Math.round(progress)}%`;
        }

        // Update status text
        if (this.statusText && status) {
            this.statusText.textContent = status;
        }
    }

    updateStatus(status) {
        if (!this.isVisible || !this.statusText) return;
        this.statusText.textContent = status;
    }

    // Show file size information
    showFileInfo(fileName, fileSize) {
        if (!this.isVisible || !this.statusText) return;

        const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
        this.statusText.textContent = `${fileName} (${sizeMB} MB)`;
    }

    // Show caching status
    showCachingStatus(cachedFiles, totalFiles) {
        if (!this.isVisible || !this.statusText) return;

        if (cachedFiles === totalFiles) {
            this.statusText.textContent = Loc('Loading from cache...');
        } else if (cachedFiles > 0) {
            this.statusText.textContent = Loc(`Loading from cache (${cachedFiles}/${totalFiles} files cached)`);
        } else {
            this.statusText.textContent = Loc('Caching files for faster future loading...');
        }
    }

    // Show processing status
    showProcessingStatus(stage) {
        if (!this.isVisible || !this.statusText) return;

        const stages = {
            'parsing': Loc('Parsing file...'),
            'importing': Loc('Importing model...'),
            'processing': Loc('Processing geometry...'),
            'rendering': Loc('Preparing for rendering...'),
            'complete': Loc('Loading complete!')
        };

        this.statusText.textContent = stages[stage] || stage;
    }
}
