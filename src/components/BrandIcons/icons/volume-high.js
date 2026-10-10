// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const VolumeHigh = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z' }),
        React.createElement('path', { d: 'M16 9a5 5 0 0 1 0 6' }),
        React.createElement('path', { d: 'M19.364 18.364a9 9 0 0 0 0-12.728' }),
    );
});

VolumeHigh.displayName = 'VolumeHigh';

VolumeHigh.propTypes = {
    className: PropTypes.string
};

module.exports = VolumeHigh;
module.exports.default = VolumeHigh;
