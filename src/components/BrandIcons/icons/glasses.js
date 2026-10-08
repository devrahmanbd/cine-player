// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Glasses = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M2 12s2.5-4 5-4 4 3.5 5 3.5S15.5 8 18 8c2.5 0 4 4 4 4' }),
        React.createElement('path', { d: 'M2 12h20' }),
        React.createElement('path', { d: 'M4 12v1a2 2 0 0 0 2 2h1' }),
        React.createElement('path', { d: 'M20 12v1a2 2 0 0 1-2 2h-1' }),
    );
});

Glasses.displayName = 'Glasses';

Glasses.propTypes = {
    className: PropTypes.string
};

module.exports = Glasses;
module.exports.default = Glasses;
