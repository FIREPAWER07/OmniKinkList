// Import and version management system
const importSystem = {
    currentVersion: '2.0.0', // Current version of the kinklist
    supportedVersions: ['1.0.0', '1.5.0', '2.0.0'],
    
    // Initialize the import system
    init: function() {
        this.setupEventListeners();
        this.setupFileDropZone();
    },

    // Set up event listeners
    setupEventListeners: function() {
        const fileInput = document.getElementById('file-input');
        const browseBtn = document.getElementById('browse-btn');
        const continueBtn = document.getElementById('continue-editing');
        const exportBtn = document.getElementById('export-updated');
        const startFreshBtn = document.getElementById('start-fresh');
        const importJsonBtn = document.getElementById('import-json');
        const clearManualBtn = document.getElementById('clear-manual');

        browseBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));
        continueBtn.addEventListener('click', () => this.continueEditing());
        exportBtn.addEventListener('click', () => this.exportUpdated());
        startFreshBtn.addEventListener('click', () => this.startFresh());
        importJsonBtn.addEventListener('click', () => this.importManualJson());
        clearManualBtn.addEventListener('click', () => this.clearManualInput());
    },

    // Set up drag and drop functionality
    setupFileDropZone: function() {
        const dropZone = document.getElementById('file-drop-zone');
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        dropZone.addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
    },

    // Handle file selection
    handleFileSelect: function(file) {
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.html')) {
            this.showError('Please select an HTML file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.processImportedFile(e.target.result);
            } catch (error) {
                console.error('Import error:', error);
                this.showError('Failed to process the imported file. Please check if it\'s a valid OmniKinkList export.');
            }
        };
        reader.readAsText(file);
    },

    // Process the imported HTML file
    processImportedFile: function(htmlContent) {
        const importData = this.extractDataFromHtml(htmlContent);
        
        if (!importData) {
            this.showError('This doesn\'t appear to be a valid OmniKinkList export file.');
            return;
        }

        const migrationResult = this.migrateData(importData);
        this.displayImportResults(importData, migrationResult);
        
        // Store the migrated data
        this.importedData = migrationResult.migratedData;
        this.migrationInfo = migrationResult;
    },

    // Extract data from HTML content
    extractDataFromHtml: function(htmlContent) {
        try {
            // Create a temporary DOM to parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // Look for version information in the HTML
            const versionInfo = this.extractVersionInfo(doc);
            
            // Extract preferences from the HTML structure
            const preferences = this.extractPreferencesFromHtml(doc);
            
            if (!preferences || Object.keys(preferences).length === 0) {
                return null;
            }

            return {
                version: versionInfo.version || '1.0.0',
                listType: versionInfo.listType || 'classic',
                exportDate: versionInfo.exportDate,
                preferences: preferences
            };
        } catch (error) {
            console.error('Error extracting data from HTML:', error);
            return null;
        }
    },

    // Extract version information from HTML
    extractVersionInfo: function(doc) {
        const info = {
            version: '1.0.0',
            listType: 'classic',
            exportDate: null
        };

        // Look for version in meta tags or comments
        const metaVersion = doc.querySelector('meta[name="kinklist-version"]');
        if (metaVersion) {
            info.version = metaVersion.getAttribute('content');
        }

        // Look for list type in the title or header
        const title = doc.querySelector('title');
        if (title && title.textContent.includes('Extended')) {
            info.listType = 'extended';
        } else if (title && title.textContent.includes('Detailed')) {
            info.listType = 'detailed';
        }

        // Look for export date in the header
        const headerText = doc.querySelector('.header p');
        if (headerText) {
            const dateMatch = headerText.textContent.match(/Generated on (.+)/);
            if (dateMatch) {
                info.exportDate = dateMatch[1];
            }
        }

        return info;
    },

    // Extract preferences from HTML structure
    extractPreferencesFromHtml: function(doc) {
        const preferences = {};
        
        // Look for preference items in the HTML
        const items = doc.querySelectorAll('.item');
        
        items.forEach(item => {
            const nameElement = item.querySelector('.item-name');
            if (!nameElement) return;
            
            const itemName = nameElement.textContent.trim();
            
            // Check for dual preferences (subcategories)
            const dualPrefs = item.querySelector('.dual-prefs');
            if (dualPrefs) {
                // Handle items with multiple subcategories
                const subPrefs = dualPrefs.querySelectorAll('div');
                subPrefs.forEach(subPref => {
                    const labelElement = subPref.querySelector('.dual-label');
                    const prefElement = subPref.querySelector('.preference');
                    
                    if (labelElement && prefElement) {
                        const subcategory = labelElement.textContent.replace(':', '').trim();
                        const level = this.extractPreferenceLevel(prefElement);
                        const choiceId = `${itemName}_${subcategory}`;
                        
                        preferences[choiceId] = {
                            choiceId: choiceId,
                            level: level
                        };
                    }
                });
            } else {
                // Handle single preference items
                const prefElement = item.querySelector('.preference');
                if (prefElement) {
                    const level = this.extractPreferenceLevel(prefElement);
                    
                    // Handle items with subcategory in parentheses
                    const subcategoryMatch = itemName.match(/^(.+?)\s*\((.+?)\)$/);
                    let choiceId;
                    
                    if (subcategoryMatch) {
                        const baseName = subcategoryMatch[1].trim();
                        const subcategory = subcategoryMatch[2].trim();
                        choiceId = `${baseName}_${subcategory}`;
                    } else {
                        choiceId = itemName;
                    }
                    
                    preferences[choiceId] = {
                        choiceId: choiceId,
                        level: level
                    };
                }
            }
        });
        
        return preferences;
    },

    // Extract preference level from element
    extractPreferenceLevel: function(element) {
        const classList = Array.from(element.classList);
        const prefClass = classList.find(cls => cls.startsWith('pref-'));
        
        if (prefClass) {
            return prefClass.replace('pref-', '');
        }
        
        // Fallback: try to extract from text content
        const text = element.textContent.toLowerCase().trim();
        const levelMap = {
            'favorite': 'favorite',
            'like': 'like',
            'indifferent': 'indifferent',
            'maybe': 'maybe',
            'dislike': 'dislike',
            'limit': 'dislike'
        };
        
        return levelMap[text] || 'indifferent';
    },

    // Migrate data to current version
    migrateData: function(importData) {
        const result = {
            originalVersion: importData.version,
            currentVersion: this.currentVersion,
            migratedData: { ...importData },
            changes: {
                added: [],
                removed: [],
                modified: [],
                categories: {
                    added: [],
                    removed: [],
                    modified: []
                }
            },
            needsUpdate: false
        };

        // Check if update is needed
        if (importData.version !== this.currentVersion) {
            result.needsUpdate = true;
            
            // Get current kinklist data
            const currentData = parseKinkListData(kinklistData[importData.listType]);
            const currentChoices = getAllPreferenceChoices(currentData);
            
            // Create maps for comparison
            const importedChoiceIds = new Set(Object.keys(importData.preferences));
            const currentChoiceIds = new Set(currentChoices.map(choice => choice.id));
            
            // Find added items
            currentChoiceIds.forEach(choiceId => {
                if (!importedChoiceIds.has(choiceId)) {
                    const choice = currentChoices.find(c => c.id === choiceId);
                    result.changes.added.push({
                        id: choiceId,
                        name: choice.displayName,
                        description: choice.description,
                        category: this.findCategoryForChoice(currentData, choiceId)
                    });
                }
            });
            
            // Find removed items
            importedChoiceIds.forEach(choiceId => {
                if (!currentChoiceIds.has(choiceId)) {
                    result.changes.removed.push({
                        id: choiceId,
                        name: choiceId,
                        level: importData.preferences[choiceId].level
                    });
                }
            });
            
            // Update preferences to include new items with default level
            result.migratedData.preferences = { ...importData.preferences };
            
            // Remove obsolete preferences
            result.changes.removed.forEach(removed => {
                delete result.migratedData.preferences[removed.id];
            });
            
            // Update version info
            result.migratedData.version = this.currentVersion;
        }

        return result;
    },

    // Find category for a choice ID
    findCategoryForChoice: function(kinkData, choiceId) {
        for (const category of kinkData) {
            const choices = getCategoryPreferenceChoices(category);
            if (choices.some(choice => choice.id === choiceId)) {
                return category.name;
            }
        }
        return 'Unknown';
    },

    // Display import results
    displayImportResults: function(importData, migrationResult) {
        const resultsDiv = document.getElementById('import-results');
        const statusDiv = document.getElementById('import-status');
        const versionDiv = document.getElementById('version-info');
        const summaryDiv = document.getElementById('migration-summary');
        const changelogSection = document.getElementById('changelog-section');
        const changelogContent = document.getElementById('changelog-content');

        resultsDiv.classList.remove('hidden');

        // Show import status
        statusDiv.innerHTML = `
            <div class="status-success">
                <span class="status-icon">✅</span>
                <span>Successfully imported ${Object.keys(importData.preferences).length} preferences</span>
            </div>
        `;

        // Show version information
        versionDiv.innerHTML = `
            <div class="version-info">
                <h4>Version Information</h4>
                <div class="version-details">
                    <div class="version-item">
                        <strong>Original Version:</strong> ${migrationResult.originalVersion}
                    </div>
                    <div class="version-item">
                        <strong>Current Version:</strong> ${migrationResult.currentVersion}
                    </div>
                    <div class="version-item">
                        <strong>List Type:</strong> ${importData.listType.charAt(0).toUpperCase() + importData.listType.slice(1)}
                    </div>
                    ${importData.exportDate ? `
                    <div class="version-item">
                        <strong>Export Date:</strong> ${importData.exportDate}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Show migration summary
        if (migrationResult.needsUpdate) {
            summaryDiv.innerHTML = `
                <div class="migration-summary">
                    <h4>Migration Summary</h4>
                    <div class="migration-stats">
                        <div class="stat-item added">
                            <span class="stat-number">${migrationResult.changes.added.length}</span>
                            <span class="stat-label">New Items</span>
                        </div>
                        <div class="stat-item removed">
                            <span class="stat-number">${migrationResult.changes.removed.length}</span>
                            <span class="stat-label">Removed Items</span>
                        </div>
                        <div class="stat-item modified">
                            <span class="stat-number">${migrationResult.changes.modified.length}</span>
                            <span class="stat-label">Modified Items</span>
                        </div>
                    </div>
                </div>
            `;

            // Show detailed changelog
            if (migrationResult.changes.added.length > 0 || migrationResult.changes.removed.length > 0) {
                changelogSection.classList.remove('hidden');
                changelogContent.innerHTML = this.generateChangelogHtml(migrationResult.changes);
            }
        } else {
            summaryDiv.innerHTML = `
                <div class="migration-summary">
                    <div class="status-info">
                        <span class="status-icon">ℹ️</span>
                        <span>Your kinklist is already up to date!</span>
                    </div>
                </div>
            `;
        }
    },

    // Generate changelog HTML
    generateChangelogHtml: function(changes) {
        let html = '';

        if (changes.added.length > 0) {
            html += `
                <div class="changelog-section">
                    <h4 class="changelog-title added">✨ New Items Added (${changes.added.length})</h4>
                    <div class="changelog-items">
                        ${changes.added.map(item => `
                            <div class="changelog-item">
                                <div class="item-name">${item.name}</div>
                                <div class="item-category">${item.category}</div>
                                ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (changes.removed.length > 0) {
            html += `
                <div class="changelog-section">
                    <h4 class="changelog-title removed">🗑️ Items Removed (${changes.removed.length})</h4>
                    <div class="changelog-items">
                        ${changes.removed.map(item => `
                            <div class="changelog-item removed">
                                <div class="item-name">${item.name}</div>
                                <div class="item-level">Was: ${item.level}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return html;
    },

    // Continue editing with imported data
    continueEditing: function() {
        if (!this.importedData) {
            this.showError('No imported data available.');
            return;
        }

        // Save the imported data to localStorage
        localStorage.setItem('selectedListType', this.importedData.listType);
        localStorage.setItem('kinklist-preferences', JSON.stringify(this.importedData.preferences));
        
        // Navigate to the kinklist page
        window.location.href = 'kinklist.html';
    },

    // Export updated version
    exportUpdated: function() {
        if (!this.importedData) {
            this.showError('No imported data available.');
            return;
        }

        // Load export utilities and export the updated data
        const kinkData = parseKinkListData(kinklistData[this.importedData.listType]);
        
        // Use the export utility from export.js
        if (typeof exportUtils !== 'undefined') {
            exportUtils.exportAsHTML(this.importedData.listType, this.importedData.preferences, kinkData);
        } else {
            this.showError('Export functionality not available. Please continue editing and export from there.');
        }
    },

    // Start fresh instead of importing
    startFresh: function() {
        if (confirm('Are you sure you want to start fresh? This will discard the imported data.')) {
            localStorage.removeItem('selectedListType');
            localStorage.removeItem('kinklist-preferences');
            window.location.href = 'index.html';
        }
    },

    // Import manual JSON
    importManualJson: function() {
        const textarea = document.getElementById('manual-import');
        const jsonText = textarea.value.trim();
        
        if (!jsonText) {
            this.showError('Please paste your preferences JSON data.');
            return;
        }

        try {
            const preferences = JSON.parse(jsonText);
            
            // Validate the structure
            if (typeof preferences !== 'object' || preferences === null) {
                throw new Error('Invalid preferences format');
            }

            // Create import data structure
            const importData = {
                version: '1.0.0', // Assume older version for manual imports
                listType: 'classic', // Default to classic
                exportDate: null,
                preferences: preferences
            };

            const migrationResult = this.migrateData(importData);
            this.displayImportResults(importData, migrationResult);
            
            this.importedData = migrationResult.migratedData;
            this.migrationInfo = migrationResult;

        } catch (error) {
            console.error('JSON import error:', error);
            this.showError('Invalid JSON format. Please check your data and try again.');
        }
    },

    // Clear manual input
    clearManualInput: function() {
        document.getElementById('manual-import').value = '';
    },

    // Show error message
    showError: function(message) {
        const statusDiv = document.getElementById('import-status');
        statusDiv.innerHTML = `
            <div class="status-error">
                <span class="status-icon">❌</span>
                <span>${message}</span>
            </div>
        `;
        
        document.getElementById('import-results').classList.remove('hidden');
    }
};

// Initialize the import system
function initImportSystem() {
    importSystem.init();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = importSystem;
}