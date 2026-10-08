// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const VolumeMute = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M11 5 6 9H2v6h4l5 4V5z' }),
        React.createElement('path', { d: 'm22 9-6 6' }),
        React.createElement('path', { d: 'm16 9 6 6' }),
    );
});

VolumeMute.displayName = 'VolumeMute';

VolumeMute.propTypes = {
    className: PropTypes.string
};

module.exports = VolumeMute;
module.exports.default = VolumeMute;
