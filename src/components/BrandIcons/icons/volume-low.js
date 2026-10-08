// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const VolumeLow = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M11 5 6 9H2v6h4l5 4V5z' }),
        React.createElement('path', { d: 'M15.54 8.46a5 5 0 0 1 0 7.07' }),
    );
});

VolumeLow.displayName = 'VolumeLow';

VolumeLow.propTypes = {
    className: PropTypes.string
};

module.exports = VolumeLow;
module.exports.default = VolumeLow;
