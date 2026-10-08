// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Adblock response UI: hard wall for anonymous visitors, dismissible notice
// during a 30-minute grace window for signed-up users (Stremio account).
// English-only strings via STR map (repo i18n scan forbids raw JSX text).
const React = require('react');
const PropTypes = require('prop-types');

const STR = {
    wallTitle: 'Ad blocker detected',
    wallBody: 'This service is supported by ads. Please disable your ad blocker for this site, then reload to continue watching.',
    noticeBody: 'Please consider disabling your ad blocker to support this service.',
    reload: 'Reload',
    dismiss: 'Dismiss',
};

const AdblockWall = ({ mode, onDismiss }) => {
    if (mode === 'none') return null;
    if (mode === 'notice') {
        return (
            <div className={'lx-adblock-notice'} role={'status'}>
                <span>{STR.noticeBody}</span>
                <button onClick={onDismiss}>{STR.dismiss}</button>
            </div>
        );
    }
    return (
        <div className={'lx-adblock-wall'} role={'alertdialog'} aria-label={STR.wallTitle}>
            <div className={'lx-adblock-card'}>
                <h2>{STR.wallTitle}</h2>
                <p>{STR.wallBody}</p>
                <button onClick={() => window.location.reload()}>{STR.reload}</button>
            </div>
        </div>
    );
};

AdblockWall.propTypes = {
    mode: PropTypes.oneOf(['none', 'notice', 'wall']).isRequired,
    onDismiss: PropTypes.func,
};

module.exports = { AdblockWall };
