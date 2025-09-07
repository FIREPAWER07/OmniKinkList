// Export functionality
const exportUtils = {
    // Export preferences as JSON
    exportAsJSON: function(listType, preferences) {
        const exportData = {
            listType: listType,
            preferences: preferences,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kinklist-${listType}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Export preferences as HTML
    exportAsHTML: function(listType, preferences, kinkData) {
        const htmlContent = this.generateHTMLExport(listType, preferences, kinkData);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kinklist-${listType}-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Generate HTML export content
    generateHTMLExport: function(listType, preferences, kinkData) {
        const stats = this.calculateStats(preferences, kinkData);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Kinklist - ${listType.charAt(0).toUpperCase() + listType.slice(1)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; padding: 40px; background: linear-gradient(135deg, #8b5cf6, #a855f7); color: white; border-radius: 16px; }
        .stats { display: flex; gap: 20px; margin: 30px 0; justify-content: center; flex-wrap: wrap; }
        .stat { text-align: center; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .stat-number { font-size: 2rem; font-weight: bold; color: #333; }
        .stat-label { color: #666; margin-top: 5px; }
        .category { margin: 30px 0; background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .category-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 20px; color: #333; }
        .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
        .item { padding: 16px; border-radius: 8px; border-left: 4px solid #ddd; }
        .item-name { font-weight: 500; margin-bottom: 8px; }
        .item-description { font-size: 0.9rem; color: #666; margin-bottom: 12px; }
        .preference { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 500; margin: 2px; }
        .pref-favorite { background: #3b82f6; color: white; }
        .pref-like { background: #10b981; color: white; }
        .pref-indifferent { background: #f59e0b; color: white; }
        .pref-maybe { background: #f97316; color: white; }
        .pref-limit { background: #dc2626; color: white; }
        .dual-prefs { display: flex; gap: 10px; flex-wrap: wrap; }
        .dual-label { font-size: 0.8rem; color: #666; margin-right: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>My Kinklist</h1>
            <p>${listType.charAt(0).toUpperCase() + listType.slice(1)} Version - Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number">${stats.total}</div>
                <div class="stat-label">Total Items</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.completed}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.favorite}</div>
                <div class="stat-label">Favorites</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.like}</div>
                <div class="stat-label">Likes</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.limit}</div>
                <div class="stat-label">Limits</div>
            </div>
        </div>
        
        ${kinkData.map(category => `
            <div class="category">
                <h2 class="category-title">${category.name}</h2>
                <div class="items-grid">
                    ${category.items.filter(item => preferences[item.name]).map(item => {
                        const pref = preferences[item.name];
                        return `
                            <div class="item">
                                <div class="item-name">${item.name}</div>
                                ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                                ${item.hasDualPreference && item.dualLabels ? `
                                    <div class="dual-prefs">
                                        <div>
                                            <span class="dual-label">${item.dualLabels.first}:</span>
                                            <span class="preference pref-${pref.level}">${pref.level.charAt(0).toUpperCase() + pref.level.slice(1)}</span>
                                        </div>
                                        ${pref.dualLevel ? `
                                            <div>
                                                <span class="dual-label">${item.dualLabels.second}:</span>
                                                <span class="preference pref-${pref.dualLevel}">${pref.dualLevel.charAt(0).toUpperCase() + pref.dualLevel.slice(1)}</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : `
                                    <span class="preference pref-${pref.level}">${pref.level.charAt(0).toUpperCase() + pref.level.slice(1)}</span>
                                `}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
    },

    // Calculate statistics for export
    calculateStats: function(preferences, kinkData) {
        const totalItems = kinkData.reduce((sum, category) => sum + category.items.length, 0);
        const completed = Object.keys(preferences).length;
        
        const stats = {
            total: totalItems,
            completed: completed,
            favorite: 0,
            like: 0,
            indifferent: 0,
            maybe: 0,
            limit: 0
        };

        Object.values(preferences).forEach(pref => {
            if (stats.hasOwnProperty(pref.level)) {
                stats[pref.level]++;
            }
            if (pref.dualLevel && stats.hasOwnProperty(pref.dualLevel)) {
                stats[pref.dualLevel]++;
            }
        });

        return stats;
    },

    // Update completion stats display
    updateCompletionStats: function(preferences, kinkData) {
        const stats = this.calculateStats(preferences, kinkData);
        const container = document.getElementById('completion-stats');
        
        container.innerHTML = `
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${stats.total}</div>
                    <div class="stat-label">Total Items</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${stats.completed}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${stats.favorite}</div>
                    <div class="stat-label">Favorites</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${stats.like}</div>
                    <div class="stat-label">Likes</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${stats.limit}</div>
                    <div class="stat-label">Limits</div>
                </div>
            </div>
        `;
    }
};