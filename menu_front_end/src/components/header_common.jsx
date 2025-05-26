import { useEffect, useState } from 'react';

function HeaderCommon() {
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    return (
        <div className="header_common">
            <h1 style={{ marginRight: '16px' }}>Menu Rating</h1>
            <button
                onClick={() => setIsDarkMode(prev => !prev)}
                className="theme_toggle"
                aria-label="Toggle Dark Mode"
            >
                {isDarkMode ? '☀️ Light' : '🌙 Night'}
            </button>
        </div>
    );
}

export default HeaderCommon;
