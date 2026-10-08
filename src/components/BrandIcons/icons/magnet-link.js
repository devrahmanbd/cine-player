// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const MagnetLink = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'm6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15' }),
        React.createElement('path', { d: 'm5 8 4 4' }),
        React.createElement('path', { d: 'm12 15 4 4' }),
    );
});

MagnetLink.displayName = 'MagnetLink';

MagnetLink.propTypes = {
    className: PropTypes.string
};

module.exports = MagnetLink;
module.exports.default = MagnetLink;
