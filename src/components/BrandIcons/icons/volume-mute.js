// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const VolumeMute = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M11 4.702a.7.7 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.7.7 0 0 0 11 19.298z' }),
        React.createElement('path', { d: 'm16.5 14.5 5-5' }),
        React.createElement('path', { d: 'm16.5 9.5 5 5' }),
    );
});

VolumeMute.displayName = 'VolumeMute';

VolumeMute.propTypes = {
    className: PropTypes.string
};

module.exports = VolumeMute;
module.exports.default = VolumeMute;
