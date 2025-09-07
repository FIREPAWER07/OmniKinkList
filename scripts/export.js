// Export functionality
const exportUtils = {
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

    // Generate HTML export content with dark mode as default
    generateHTMLExport: function(listType, preferences, kinkData) {
        const stats = this.calculateStats(preferences, kinkData);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Kinklist - ${listType.charAt(0).toUpperCase() + listType.slice(1)}</title>
    <style>
        :root {
            --background: #111111;
            --foreground: #fafafa;
            --card: #1e1e1e;
            --card-foreground: #fafafa;
            --primary: #a855f7;
            --primary-foreground: #18181b;
            --secondary: #27272a;
            --secondary-foreground: #fafafa;
            --muted: #27272a;
            --muted-foreground: #a1a1aa;
            --border: #27272a;
            --input: #27272a;
            --ring: #52525b;
            --color-favorite: #60a5fa;
            --color-like: #34d399;
            --color-indifferent: #fbbf24;
            --color-maybe: #fb923c;
            --color-limit: #f87171;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: var(--background);
            color: var(--foreground);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 40px;
            background: linear-gradient(135deg, #8b5cf6, #a855f7);
            color: white;
            border-radius: 16px;
        }
        
        .promo-text {
            margin-top: 20px;
            font-size: 1rem;
            opacity: 0.9;
        }
        
        .promo-text a {
            color: white;
            text-decoration: underline;
        }
        
        .stats {
            display: flex;
            gap: 20px;
            margin: 30px 0;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .stat {
            text-align: center;
            padding: 20px;
            background: var(--card);
            border-radius: 12px;
            border: 1px solid var(--border);
            min-width: 100px;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
        }
        
        .stat-label {
            color: var(--muted-foreground);
            margin-top: 5px;
        }
        
        .category {
            margin: 30px 0;
            background: var(--card);
            border-radius: 12px;
            padding: 24px;
            border: 1px solid var(--border);
        }
        
        .category-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: var(--foreground);
        }
        
        .items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
        }
        
        .item {
            padding: 16px;
            border-radius: 8px;
            border-left: 4px solid var(--primary);
            background: rgba(168, 85, 247, 0.05);
        }
        
        .item-name {
            font-weight: 500;
            margin-bottom: 8px;
            color: var(--foreground);
        }
        
        .item-description {
            font-size: 0.9rem;
            color: var(--muted-foreground);
            margin-bottom: 12px;
        }
        
        .preference {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            margin: 2px;
            color: white;
        }
        
        .pref-favorite { background: var(--color-favorite); }
        .pref-like { background: var(--color-like); }
        .pref-indifferent { background: var(--color-indifferent); }
        .pref-maybe { background: var(--color-maybe); }
        .pref-limit { background: var(--color-limit); }
        
        .dual-prefs {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 8px;
        }
        
        .dual-label {
            font-size: 0.8rem;
            color: var(--muted-foreground);
            margin-right: 5px;
        }
        
        @media (max-width: 768px) {
            .stats {
                flex-direction: column;
                align-items: center;
            }
            
            .items-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>My Kinklist</h1>
            <p>${listType.charAt(0).toUpperCase() + listType.slice(1)} Version - Generated on ${new Date().toLocaleDateString()}</p>
            <div class="promo-text">
                You want to create a kinky list like this? Check out <a href="https://firepawer07.github.io/OmniKinkList/" target="_blank">https://firepawer07.github.io/OmniKinkList/</a>!
            </div>
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
                ${category.items.filter(item => preferences[item.name] && 
                    (preferences[item.name].level !== 'not-entered' || 
                     preferences[item.name].dualLevel !== 'not-entered')).map(item => {
                    const pref = preferences[item.name];
                    return `
                        <div class="item">
                            <div class="item-name">${item.name}</div>
                            ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                            ${item.hasDualPreference && item.dualLabels ? `
                                <div class="dual-prefs">
                                    <div>
                                        <span class="dual-label">${item.dualLabels.first}:</span>
                                        <span class="preference pref-${pref.level}">${pref.level !== 'not-entered' ? pref.level.charAt(0).toUpperCase() + pref.level.slice(1) : 'Not set'}</span>
                                    </div>
                                    <div>
                                        <span class="dual-label">${item.dualLabels.second}:</span>
                                        <span class="preference pref-${pref.dualLevel}">${pref.dualLevel !== 'not-entered' ? pref.dualLevel.charAt(0).toUpperCase() + pref.dualLevel.slice(1) : 'Not set'}</span>
                                    </div>
                                </div>
                            ` : `
                                <span class="preference pref-${pref.level}">${pref.level !== 'not-entered' ? pref.level.charAt(0).toUpperCase() + pref.level.slice(1) : 'Not set'}</span>
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
    }
};