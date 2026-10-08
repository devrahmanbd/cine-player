// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Icon dock navigating existing routes only. No route logic changes.
const React = require('react');
const { useLocation, useNavigate } = require('react-router');

const TABS = [
    { path: '/', label: 'Board', short: 'Home' },
    { path: '/discover', label: 'Discover', short: 'Find' },
    { path: '/library', label: 'Library', short: 'Saved' },
    { path: '/calendar', label: 'Calendar', short: 'Cal' },
    { path: '/search', label: 'Search', short: 'Seek' },
    { path: '/settings', label: 'Settings', short: 'Setup' },
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
                    <span className={'lx-dock-label'}>{tab.short}</span>
                </button>
            ))}
        </nav>
    );
};

module.exports = Dock;
