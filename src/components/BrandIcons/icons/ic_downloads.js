// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const IcDownloads = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z' }),
        React.createElement('path', { d: 'M12 10v6' }),
        React.createElement('path', { d: 'm15 13-3 3-3-3' }),
    );
});

IcDownloads.displayName = 'IcDownloads';

IcDownloads.propTypes = {
    className: PropTypes.string
};

module.exports = IcDownloads;
module.exports.default = IcDownloads;
