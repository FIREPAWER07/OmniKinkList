// Global state
let currentListType = null;
let preferences = {};
let kinkData = [];

// Initialize app
function init() {
    initTheme();
    initEventListeners();
    
    // Load saved preferences
    preferences = storage.loadPreferences();
    
    // Add scroll to top functionality
    initScrollToTop();
    
    // Handle page navigation based on URL hash
    handlePageNavigation();
}

// Handle page navigation based on URL hash
function handlePageNavigation() {
    const hash = window.location.hash;
    
    if (hash === '#kinklist' && currentListType) {
        showKinklist();
    } else if (hash === '#completion') {
        showCompletion();
    } else {
        showListSelection();
    }
}

// Update URL hash for page navigation
function updateUrlHash(page) {
    if (page === 'list-selection') {
        history.replaceState(null, null, ' ');
    } else if (page === 'kinklist-page') {
        history.replaceState(null, null, '#kinklist');
    } else if (page === 'completion-page') {
        history.replaceState(null, null, '#completion');
    }
}

// Initialize scroll to top button
function initScrollToTop() {
    const scrollBtn = document.getElementById('scroll-to-top');
    if (scrollBtn) {
        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        // Show/hide based on scroll position
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollBtn.style.display = 'flex';
            } else {
                scrollBtn.style.display = 'none';
            }
        });
        
        // Initially hide the button
        scrollBtn.style.display = 'none';
    }
}

// Theme management
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    
    if (body.classList.contains('dark')) {
        body.classList.remove('dark');
        themeIcon.textContent = '🌙';
        storage.saveTheme('light');
    } else {
        body.classList.add('dark');
        themeIcon.textContent = '☀️';
        storage.saveTheme('dark');
    }
}

// Initialize theme
function initTheme() {
    const savedTheme = storage.loadTheme();
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark');
        document.getElementById('theme-icon').textContent = '☀️';
    }
}

// Initialize event listeners
function initEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // List selection buttons
    document.querySelectorAll('.list-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectListType(e.currentTarget.dataset.type);
        });
    });
    
    // Import functionality
    document.getElementById('import-button').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    
    document.getElementById('import-file').addEventListener('change', importPreferences);
    
    // Navigation buttons
    document.getElementById('back-to-selection').addEventListener('click', showListSelection);
    document.getElementById('reset-all').addEventListener('click', resetAll);
    document.getElementById('complete-export').addEventListener('click', showCompletion);
    document.getElementById('back-to-edit').addEventListener('click', showKinklist);
    document.getElementById('start-over').addEventListener('click', showListSelection);
    document.getElementById('quick-complete-export').addEventListener('click', showCompletion);
    
    // Export buttons
    document.getElementById('export-json').addEventListener('click', () => {
        exportUtils.exportAsJSON(currentListType, preferences);
    });
    
    document.getElementById('export-html').addEventListener('click', () => {
        exportUtils.exportAsHTML(currentListType, preferences, kinkData);
    });
}

// Page navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    updateUrlHash(pageId);
}

function showListSelection() {
    showPage('list-selection');
}

function showKinklist() {
    showPage('kinklist-page');
}

function showCompletion() {
    exportUtils.updateCompletionStats(preferences, kinkData);
    showPage('completion-page');
}

// List type selection
function selectListType(type) {
    currentListType = type;
    
    // Update active button
    document.querySelectorAll('.list-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.list-type-btn[data-type="${type}"]`).classList.add('active');
    
    // Parse and load data
    kinkData = parseKinkListData(kinklistData[type]);
    renderKinklist();
    showKinklist();
}

// Preference management
function setPreference(itemName, level, isDual = false, dualType = null) {
    if (!preferences[itemName]) {
        preferences[itemName] = {
            itemName,
            level: 'not-entered'
        };
    }

    if (isDual && dualType) {
        preferences[itemName].dualLevel = level;
    } else {
        preferences[itemName].level = level;
    }

    // Save to localStorage
    storage.savePreferences(preferences);
    
    // Update UI
    updateProgress();
    updatePreferenceButton(itemName, level, isDual, dualType);
}

function updatePreferenceButton(itemName, level, isDual, dualType) {
    const selector = isDual ? 
        `[data-item="${itemName}"][data-dual="${dualType}"]` : 
        `[data-item="${itemName}"]:not([data-dual])`;
    
    const buttons = document.querySelectorAll(`${selector} .pref-btn`);
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const activeButton = document.querySelector(`${selector} .pref-btn[data-level="${level}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Progress tracking
function updateProgress() {
    const totalItems = kinkData.reduce((sum, category) => sum + category.items.length, 0);
    const completedItems = Object.keys(preferences).length;
    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('completed-items').textContent = completedItems;
    document.getElementById('completion-percentage').textContent = `${percentage}%`;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
}

// Render kinklist
function renderKinklist() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    kinkData.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';

        const explanation = categoryExplanations[category.name] || '';
        
        categoryDiv.innerHTML = `
            <div class="category-header">
                <h2 class="category-title">${category.name}</h2>
                ${explanation ? `<p class="category-description">${explanation}</p>` : ''}
                ${category.subcategory ? `<p class="subcategory-title">${category.subcategory}</p>` : ''}
            </div>
            <div class="items-grid">
                ${category.items.map(item => renderKinkItem(item)).join('')}
            </div>
        `;

        container.appendChild(categoryDiv);
    });

    // Add event listeners
    addPreferenceListeners();
    updateProgress();
}

function renderKinkItem(item) {
    const preference = preferences[item.name];
    const currentLevel = preference ? preference.level : 'not-entered';
    const currentDualLevel = preference ? preference.dualLevel : 'not-entered';
    
    if (item.hasDualPreference && item.dualLabels) {
        return `
            <div class="kink-item">
                <div class="item-name">${item.name}</div>
                ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                <div class="dual-preferences">
                    <div>
                        <div class="dual-label">${item.dualLabels.first}</div>
                        <div class="preference-buttons" data-item="${item.name}" data-dual="first">
                            ${renderPreferenceButtons(currentLevel)}
                        </div>
                    </div>
                    <div>
                        <div class="dual-label">${item.dualLabels.second}</div>
                        <div class="preference-buttons" data-item="${item.name}" data-dual="second">
                            ${renderPreferenceButtons(currentDualLevel)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="kink-item">
                <div class="item-name">${item.name}</div>
                ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                <div class="preference-buttons" data-item="${item.name}">
                    ${renderPreferenceButtons(currentLevel)}
                </div>
            </div>
        `;
    }
}

function renderPreferenceButtons(currentLevel) {
    const levels = ['favorite', 'like', 'indifferent', 'maybe', 'limit'];
    return levels.map(level => `
        <button class="pref-btn pref-${level} ${currentLevel === level ? 'active' : ''}" 
                data-level="${level}" 
                title="${level.charAt(0).toUpperCase() + level.slice(1)}">
            ${level.charAt(0).toUpperCase()}
        </button>
    `).join('');
}

function addPreferenceListeners() {
    document.querySelectorAll('.pref-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const level = e.target.dataset.level;
            const container = e.target.closest('.preference-buttons');
            const itemName = container.dataset.item;
            const dualType = container.dataset.dual;
            
            setPreference(itemName, level, !!dualType, dualType);
        });
    });
}

// Reset functionality
function resetAll() {
    if (confirm('Are you sure you want to reset all preferences?')) {
        preferences = {};
        storage.clearPreferences();
        renderKinklist();
    }
}

// Import functionality
function importPreferences(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.preferences && data.listType) {
                preferences = data.preferences;
                currentListType = data.listType;
                
                // Update UI
                document.querySelectorAll('.list-type-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                const activeBtn = document.querySelector(`.list-type-btn[data-type="${currentListType}"]`);
                if (activeBtn) {
                    activeBtn.classList.add('active');
                }
                
                kinkData = parseKinkListData(kinklistData[currentListType]);
                renderKinklist();
                showKinklist();
                
                alert('Preferences imported successfully!');
            } else {
                alert('Invalid file format');
            }
        } catch (error) {
            alert('Error reading file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Start the app
document.addEventListener('DOMContentLoaded', init);