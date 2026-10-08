// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const EyeOff = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M9.88 9.88a3 3 0 1 0 4.24 4.24' }),
        React.createElement('path', { d: 'M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68' }),
        React.createElement('path', { d: 'M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61' }),
        React.createElement('path', { d: 'm2 2 20 20' }),
    );
});

EyeOff.displayName = 'EyeOff';

EyeOff.propTypes = {
    className: PropTypes.string
};

module.exports = EyeOff;
module.exports.default = EyeOff;
