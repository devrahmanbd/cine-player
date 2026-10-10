// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const VolumeOff = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M16 9a5 5 0 0 1 .95 2.293' }),
        React.createElement('path', { d: 'M19.364 5.636a9 9 0 0 1 1.889 9.96' }),
        React.createElement('path', { d: 'm2 2 20 20' }),
        React.createElement('path', { d: 'm7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11' }),
        React.createElement('path', { d: 'M9.828 4.172A.686.686 0 0 1 11 4.657v.686' }),
    );
});

VolumeOff.displayName = 'VolumeOff';

VolumeOff.propTypes = {
    className: PropTypes.string
};

module.exports = VolumeOff;
module.exports.default = VolumeOff;
