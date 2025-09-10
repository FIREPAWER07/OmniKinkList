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

    // Generate HTML export content with new theme system
    generateHTMLExport: function(listType, preferences, kinkData) {
        const stats = this.calculateStats(preferences, kinkData);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My OmniKinklist - ${listType.charAt(0).toUpperCase() + listType.slice(1)}</title>
    <style>
        /* CSS Variables for theming - Dark mode as default */
        :root {
            --background: #0a0a0a;
            --foreground: #fafafa;
            --card: #1a1a1a;
            --card-foreground: #fafafa;
            --primary: #ff6b9d;
            --primary-foreground: #ffffff;
            --secondary: #2a2a2a;
            --secondary-foreground: #fafafa;
            --muted: #2a2a2a;
            --muted-foreground: #b0b0b0;
            --border: #333333;
            --input: #2a2a2a;
            --ring: #52525b;
            
            /* Preference colors */
            --color-favorite: #ff6b9d;
            --color-like: #4ecdc4;
            --color-indifferent: #ffd93d;
            --color-maybe: #ff8c42;
            --color-dislike: #ff4757;
            --color-not-entered: #374151;
            
            /* New accent colors */
            --accent-pink: #ff6b9d;
            --accent-purple: #a55eea;
            --accent-orange: #ff8c42;
            
            /* Radius and shadows */
            --radius-sm: 4px;
            --radius-md: 8px;
            --radius-lg: 12px;
            --radius-xl: 16px;
            --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            --transition: all 0.2s ease;
            --transition-slow: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .light {
            /* Pastel color scheme for light theme */
            --background: linear-gradient(135deg, #f8c6ff 0%, #fff0fe 50%, #f8c6ff 100%);
            --foreground: #2d3748;
            --card: rgba(255, 255, 255, 0.8);
            --card-foreground: #2d3748;
            --primary: #ec4899;
            --primary-foreground: #ffffff;
            --secondary: rgba(243, 232, 255, 0.7);
            --secondary-foreground: #553c9a;
            --muted: rgba(243, 232, 255, 0.5);
            --muted-foreground: #6b7280;
            --border: rgba(219, 234, 254, 0.6);
            --input: rgba(243, 232, 255, 0.7);
            --ring: #c084fc;
            
            /* Pastel preference colors */
            --color-favorite: #f472b6;
            --color-like: #34d399;
            --color-indifferent: #fbbf24;
            --color-maybe: #fb923c;
            --color-dislike: #f87171;
            --color-not-entered: #e2e8f0;
            
            /* Pastel accent colors */
            --accent-pink: #ff6b9d;
            --accent-teal: #34d399;
            --accent-purple: #c084fc;
            --accent-orange: #fb923c;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: var(--background);
            color: var(--foreground);
            line-height: 1.6;
            min-height: 100vh;
            overflow-x: hidden;
            transition: var(--transition-slow);
            padding: 20px;
        }

        /* Light theme specific background */
        body.light {
            background: var(--background);
            background-attachment: fixed;
        }

        /* Animated background elements */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 80%, rgba(255, 107, 157, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(180, 78, 205, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(165, 94, 234, 0.05) 0%, transparent 50%);
            pointer-events: none;
            z-index: -1;
            animation: backgroundFloat 20s ease-in-out infinite;
            transition: opacity 0.4s ease;
        }

        /* Light theme background overlay */
        body.light::before {
            background: 
                radial-gradient(circle at 20% 80%, rgba(244, 114, 182, 0.08) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(52, 211, 153, 0.08) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(192, 132, 252, 0.06) 0%, transparent 50%);
        }

        @keyframes backgroundFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-10px) rotate(1deg); }
            66% { transform: translateY(5px) rotate(-1deg); }
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            position: relative;
            z-index: 1;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 40px;
            background: 
                linear-gradient(135deg, rgba(255, 107, 157, 0.8), rgba(165, 94, 234, 0.8)),
                url('https://i.imgur.com/6MCFCjF.png') center/cover no-repeat;
            background-blend-mode: overlay;
            aspect-ratio: 3 / 1;
            color: white;
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-xl);
            position: relative;
            overflow: hidden;
            animation: headerGlow 3s ease-in-out infinite alternate;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }

        @keyframes headerGlow {
            0% { box-shadow: var(--shadow-xl), 0 0 30px rgba(255, 107, 157, 0.3); }
            100% { box-shadow: var(--shadow-xl), 0 0 50px rgba(255, 107, 157, 0.5); }
        }

        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: none;
            z-index: 1;
        }

        .header::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.15), transparent);
            animation: headerShine 4s ease-in-out infinite;
            pointer-events: none;
            z-index: 3;
        }

        @keyframes headerShine {
            0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
            50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
            100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        }

        .header h1 {
            font-size: 3.5rem;
            font-weight: 800;
            margin-bottom: 10px;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 0, 0, 0.5);
            position: relative;
            z-index: 4;
            line-height: 1.1;
            word-break: break-word;
            hyphens: auto;
        }

        .header p {
            font-size: 1.6rem;
            opacity: 0.9;
            text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 0, 0, 0.4);
            position: relative;
            z-index: 4;
            line-height: 1.3;
            word-break: break-word;
            hyphens: auto;
        }
        
        .promo-text {
            margin-top: 20px;
            font-size: 1.5rem;
            opacity: 0.9;
            position: relative;
            z-index: 4;
            text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 0, 0, 0.4);
            line-height: 1.4;
            word-break: break-word;
            hyphens: auto;
        }
        
        .promo-text a {
            color: white;
            text-decoration: underline;
            transition: var(--transition);
            text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
        }

        .promo-text a:hover {
            opacity: 0.8;
            text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(255, 255, 255, 0.3);
        }

        /* Theme Toggle */
        .theme-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 50%;
            width: 50px;
            height: 50px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            transition: var(--transition-slow);
            z-index: 1000;
            box-shadow: var(--shadow-md);
            animation: themeToggleFloat 4s ease-in-out infinite;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        @keyframes themeToggleFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-3px) rotate(5deg); }
        }

        .theme-toggle:hover {
            transform: scale(1.15) rotate(15deg) translateY(-2px);
            box-shadow: var(--shadow-lg);
            background: var(--primary);
            color: var(--primary-foreground);
            border-color: var(--primary);
        }

        .theme-toggle:active {
            transform: scale(1.05) rotate(5deg);
            transition: transform 0.1s ease;
        }
        
        .stats {
            display: flex;
            gap: 20px;
            margin: 30px 0;
            justify-content: center;
            flex-wrap: wrap;
            padding: 0 10px;
        }
        
        .stat {
            text-align: center;
            padding: 20px;
            background: var(--card);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border);
            min-width: 100px;
            flex: 1;
            max-width: 150px;
            transition: var(--transition-slow);
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .stat::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: var(--primary);
            transform: scaleX(0);
            transition: transform 0.3s ease;
        }

        .stat:hover::before {
            transform: scaleX(1);
        }

        .stat:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-md);
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: 700;
            color: var(--foreground);
            transition: var(--transition);
        }

        .stat:hover .stat-number {
            transform: scale(1.1);
            color: var(--primary);
        }
        
        .stat-label {
            color: var(--muted-foreground);
            margin-top: 5px;
            font-size: 0.85rem;
        }
        
        .category {
            margin: 30px 0;
            background: var(--card);
            border-radius: var(--radius-xl);
            padding: 24px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-md);
            transition: var(--transition-slow);
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .category::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 50% 50%, rgba(255, 107, 157, 0.05) 0%, transparent 50%);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }

        .category:hover::before {
            opacity: 1;
        }

        .category:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-xl);
            border-color: rgba(255, 107, 157, 0.3);
        }
        
        .category-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            color: var(--foreground);
            display: flex;
            align-items: center;
            gap: 10px;
            transition: var(--transition);
            position: relative;
            z-index: 1;
            cursor: pointer;
            user-select: none;
            padding: 8px;
            margin: -8px -8px 12px -8px;
            border-radius: var(--radius-md);
        }

        .category:hover .category-title {
            color: var(--primary);
        }

        .category-title:hover {
            background: var(--muted);
        }

        .category-title:active {
            transform: scale(0.98);
        }

        .category-title::before {
            content: "";
            display: block;
            width: 12px;
            height: 12px;
            border-radius: 4px;
            background: linear-gradient(135deg, var(--accent-pink), var(--accent-purple));
            transition: var(--transition);
            animation: titleDot 2s ease-in-out infinite;
        }

        @keyframes titleDot {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }

        .category:hover .category-title::before {
            transform: scale(1.3);
            box-shadow: 0 0 10px rgba(255, 107, 157, 0.5);
        }
        
        .category-toggle {
            margin-left: auto;
            font-size: 1.2rem;
            transition: var(--transition);
            color: var(--muted-foreground);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--muted);
        }

        .category-toggle:hover {
            background: var(--primary);
            color: var(--primary-foreground);
            transform: scale(1.1);
        }

        .category.collapsed .category-toggle {
            transform: rotate(180deg);
        }

        .category.collapsed .category-toggle:hover {
            transform: rotate(180deg) scale(1.1);
        }
        .items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
            position: relative;
            z-index: 1;
            transition: var(--transition-slow);
            overflow: hidden;
        }

        .category.collapsed .items-grid {
            max-height: 0;
            opacity: 0;
            margin-top: 0;
            padding-top: 0;
        }
        
        .item {
            padding: 16px;
            border-radius: var(--radius-lg);
            border-left: 4px solid var(--primary);
            background: var(--card);
            border: 1px solid var(--border);
            transition: var(--transition-slow);
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            word-break: break-word;
            hyphens: auto;
        }

        .item::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 107, 157, 0.05), transparent);
            transition: left 0.5s ease;
        }

        .item:hover::before {
            left: 100%;
        }

        .item:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: var(--shadow-lg);
            border-color: var(--primary);
        }
        
        .item-name {
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--foreground);
            position: relative;
            z-index: 1;
            transition: var(--transition);
            word-break: break-word;
            hyphens: auto;
            line-height: 1.3;
        }

        .item:hover .item-name {
            color: var(--primary);
        }
        
        .item-description {
            font-size: 0.9rem;
            color: var(--muted-foreground);
            margin-bottom: 12px;
            line-height: 1.4;
            position: relative;
            z-index: 1;
            word-break: break-word;
            hyphens: auto;
        }
        
        .preference {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            margin: 2px;
            color: white;
            transition: var(--transition);
            position: relative;
            z-index: 1;
        }

        .preference:hover {
            transform: scale(1.05);
        }
        
        .pref-favorite { background: var(--color-favorite); }
        .pref-like { background: var(--color-like); }
        .pref-indifferent { background: var(--color-indifferent); }
        .pref-maybe { background: var(--color-maybe); }
        .pref-dislike { background: var(--color-dislike); }
        .pref-limit { background: var(--color-dislike); }
        
        .dual-prefs {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 8px;
            position: relative;
            z-index: 1;
            align-items: flex-start;
        }
        
        .dual-label {
            font-size: 0.8rem;
            color: var(--muted-foreground);
            margin-right: 5px;
            font-weight: 500;
            white-space: nowrap;
            flex-shrink: 0;
        }
        
        @media (max-width: 768px) {
            body {
                padding: 15px;
            }
            
            .header {
                padding: 30px 20px;
                margin-bottom: 30px;
                aspect-ratio: 2 / 1;
                min-height: 180px;
            }

            .header h1 {
                font-size: 2.2rem;
                margin-bottom: 8px;
            }

            .header p {
                font-size: 1.2rem;
            }

            .promo-text {
                font-size: 1.1rem;
                margin-top: 15px;
                padding: 0 10px;
            }
            
            .stats {
                gap: 10px;
                margin: 20px 0;
                padding: 0 5px;
            }

            .stat {
                padding: 15px 10px;
                min-width: 80px;
                max-width: none;
                flex: 1;
            }
            
            .items-grid {
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 12px;
            }

            .category {
                padding: 20px 15px;
                margin: 20px 0;
            }

            .category-title {
                font-size: 1.3rem;
                margin-bottom: 15px;
            }

            .item {
                padding: 15px;
            }

            .dual-prefs {
                gap: 8px;
                flex-direction: column;
                align-items: stretch;
            }

            .dual-prefs > div {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 5px;
            }

            .preference {
                font-size: 0.75rem;
                padding: 3px 10px;
            }

            .theme-toggle {
                width: 45px;
                height: 45px;
                font-size: 18px;
                top: 15px;
                right: 15px;
            }
        }

        @media (max-width: 480px) {
            body {
                padding: 10px;
            }

            .container {
                padding: 0;
            }

            .header {
                padding: 25px 15px;
                margin-bottom: 25px;
                aspect-ratio: 1.5 / 1;
                min-height: 160px;
            }

            .header h1 {
                font-size: 1.8rem;
                margin-bottom: 6px;
            }

            .header p {
                font-size: 1rem;
            }

            .promo-text {
                font-size: 0.95rem;
                margin-top: 12px;
                padding: 0 5px;
            }

            .stats {
                gap: 8px;
                margin: 15px 0;
                padding: 0;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
            }

            .stat {
                min-width: 70px;
                max-width: none;
                padding: 12px 8px;
                flex: none;
            }

            .stat-number {
                font-size: 1.5rem;
            }

            .stat-label {
                font-size: 0.75rem;
                line-height: 1.2;
            }

            .items-grid {
                grid-template-columns: 1fr;
                gap: 10px;
            }

            .category {
                padding: 15px 10px;
                margin: 15px 0;
            }

            .category-title {
                font-size: 1.2rem;
                margin-bottom: 12px;
            }

            .item {
                padding: 12px;
            }

            .item-name {
                font-size: 0.95rem;
                margin-bottom: 6px;
            }

            .item-description {
                font-size: 0.85rem;
                margin-bottom: 10px;
            }

            .dual-label {
                font-size: 0.75rem;
                margin-right: 3px;
            }

            .preference {
                font-size: 0.7rem;
                padding: 2px 8px;
                margin: 1px;
            }

            .theme-toggle {
                width: 40px;
                height: 40px;
                font-size: 16px;
                top: 10px;
                right: 10px;
            }
        }

        @media (max-width: 360px) {
            .header h1 {
                font-size: 1.6rem;
            }

            .header p {
                font-size: 0.9rem;
            }

            .promo-text {
                font-size: 0.85rem;
            }

            .stats {
                grid-template-columns: repeat(3, 1fr);
                gap: 6px;
            }

            .stat {
                padding: 10px 6px;
            }

            .stat-number {
                font-size: 1.3rem;
            }

            .stat-label {
                font-size: 0.7rem;
            }

            .category {
                padding: 12px 8px;
            }

            .item {
                padding: 10px;
            }

            .item-name {
                font-size: 0.9rem;
            }

            .item-description {
                font-size: 0.8rem;
            }

            .preference {
                font-size: 0.65rem;
                padding: 2px 6px;
            }
        }

        /* Landscape phone orientation */
        @media (max-width: 768px) and (orientation: landscape) {
            .header {
                aspect-ratio: 3 / 1;
                min-height: 120px;
                padding: 20px 15px;
            }

            .header h1 {
                font-size: 1.8rem;
            }

            .header p {
                font-size: 1rem;
            }

            .promo-text {
                font-size: 0.9rem;
                margin-top: 10px;
            }

            .stats {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 8px;
            }

            .stat {
                flex: 0 1 auto;
                min-width: 70px;
                max-width: 100px;
            }
        }

        /* Touch-friendly improvements */
        @media (hover: none) and (pointer: coarse) {
            .theme-toggle {
                width: 50px;
                height: 50px;
                font-size: 20px;
            }

            .item {
                padding: 18px;
            }

            .preference {
                padding: 6px 12px;
                margin: 3px;
                min-height: 28px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .dual-prefs > div {
                margin-bottom: 5px;
            }
        }

        /* High DPI displays */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
            .header {
                background-size: cover;
            }

            .item-name,
            .item-description,
            .category-title {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
        }

        /* Reduce motion for users who prefer it */
        @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    </style>
</head>
<body class="dark">
    <button class="theme-toggle" id="theme-toggle" title="Toggle theme">
        <span id="theme-icon">☀️</span>
    </button>

    <div class="container">
        <div class="header">
            <h1>My OmniKinklist</h1>
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
                <div class="stat-number">${stats.indifferent}</div>
                <div class="stat-label">Indifferent</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.maybe}</div>
                <div class="stat-label">Maybe</div>
            </div>
            <div class="stat">
                <div class="stat-number">${stats.dislike}</div>
                <div class="stat-label">Dislikes</div>
            </div>
        </div>        
        
        ${kinkData.map(category => {
            const categoryChoices = getCategoryPreferenceChoices(category);
            const completedChoices = categoryChoices.filter(choice => 
                preferences[choice.id] && preferences[choice.id].level !== 'not-entered'
            );
            
            if (completedChoices.length === 0) {
                return '';
            }
            
            return `
            <div class="category">
                <h2 class="category-title" onclick="toggleCategory(this)">
                    ${category.name}
                    <span class="category-toggle">▼</span>
                </h2>
                <div class="items-grid">
                    ${completedChoices.map(choice => {
                        const pref = preferences[choice.id];
                        return `
                            <div class="item">
                                <div class="item-name">${choice.displayName}</div>
                                ${choice.description ? `<div class="item-description">${choice.description}</div>` : ''}
                                <span class="preference pref-${pref.level}">${pref.level !== 'not-entered' ? pref.level.charAt(0).toUpperCase() + pref.level.slice(1) : 'Not set'}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>`;
        }).filter(categoryHtml => categoryHtml !== '').join('')}
    </div>

    <script>
        // Theme functionality
        function initTheme() {
            const savedTheme = localStorage.getItem('kinklist-export-theme');
            
            // Default to dark mode if no preference is saved
            if (savedTheme === 'light') {
                document.body.classList.remove('dark');
                document.body.classList.add('light');
                document.getElementById('theme-icon').textContent = '🌙';
            } else {
                document.body.classList.add('dark');
                document.body.classList.remove('light');
                document.getElementById('theme-icon').textContent = '☀️';
                localStorage.setItem('kinklist-export-theme', 'dark');
            }
        }

        function toggleTheme() {
            const body = document.body;
            const themeIcon = document.getElementById('theme-icon');
            
            if (body.classList.contains('dark')) {
                body.classList.remove('dark');
                body.classList.add('light');
                themeIcon.textContent = '🌙';
                localStorage.setItem('kinklist-export-theme', 'light');
            } else {
                body.classList.add('dark');
                body.classList.remove('light');
                themeIcon.textContent = '☀️';
                localStorage.setItem('kinklist-export-theme', 'dark');
            }
        }

        // Initialize theme on load
        document.addEventListener('DOMContentLoaded', function() {
            initTheme();
            document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
        });

        // Category toggle functionality
        function toggleCategory(titleElement) {
            const category = titleElement.parentElement;
            category.classList.toggle('collapsed');
            
            // Save collapsed state to localStorage
            const categoryName = titleElement.textContent.trim().replace('▼', '').replace('▲', '');
            const collapsedCategories = JSON.parse(localStorage.getItem('kinklist-collapsed-categories') || '[]');
            
            if (category.classList.contains('collapsed')) {
                if (!collapsedCategories.includes(categoryName)) {
                    collapsedCategories.push(categoryName);
                }
            } else {
                const index = collapsedCategories.indexOf(categoryName);
                if (index > -1) {
                    collapsedCategories.splice(index, 1);
                }
            }
            
            localStorage.setItem('kinklist-collapsed-categories', JSON.stringify(collapsedCategories));
        }

        // Restore collapsed state on load
        document.addEventListener('DOMContentLoaded', function() {
            const collapsedCategories = JSON.parse(localStorage.getItem('kinklist-collapsed-categories') || '[]');
            
            document.querySelectorAll('.category-title').forEach(title => {
                const categoryName = title.textContent.trim().replace('▼', '').replace('▲', '');
                if (collapsedCategories.includes(categoryName)) {
                    title.parentElement.classList.add('collapsed');
                }
            });
        });
    </script>
</body>
</html>`;
    },

    // Calculate statistics for export
    calculateStats: function(preferences, kinkData) {
        const allChoices = getAllPreferenceChoices(kinkData);
        const totalItems = allChoices.length;
        const completed = Object.keys(preferences).length;
        
        const stats = {
            total: totalItems,
            completed: completed,
            favorite: 0,
            like: 0,
            indifferent: 0,
            maybe: 0,
            dislike: 0
        };

        Object.values(preferences).forEach(pref => {
            if (stats.hasOwnProperty(pref.level)) {
                stats[pref.level]++;
            }
        });

        return stats;
    }
};