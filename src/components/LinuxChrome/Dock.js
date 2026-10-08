// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Icon dock navigating existing routes only. No route logic changes.
const React = require('react');
const { useLocation, useNavigate } = require('react-router');

const TABS = [
    { path: '/', label: 'Board', icon: '▦' },
    { path: '/discover', label: 'Discover', icon: '◉' },
    { path: '/library', label: 'Library', icon: '▤' },
    { path: '/calendar', label: 'Calendar', icon: '◫' },
    { path: '/search', label: 'Search', icon: '⌕' },
    { path: '/settings', label: 'Settings', icon: '⚙' },
];

const Dock = () => {
    const location = useLocation();
    const navigate = useNavigate();
    return (
        <nav className={'lx-dock'} aria-label={'Sections'}>
            {TABS.map((tab) => (
                <button
                    key={tab.path}
                    title={tab.label}
                    aria-label={tab.label}
                    className={location.pathname === tab.path ? 'lx-active' : ''}
                    onClick={() => navigate(tab.path)}
                >
                    {tab.icon}
                </button>
            ))}
        </nav>
    );
};

module.exports = Dock;
