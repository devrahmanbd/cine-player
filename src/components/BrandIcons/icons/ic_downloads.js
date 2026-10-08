// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const IcDownloads = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z' }),
    );
});

IcDownloads.displayName = 'IcDownloads';

IcDownloads.propTypes = {
    className: PropTypes.string
};

module.exports = IcDownloads;
module.exports.default = IcDownloads;
