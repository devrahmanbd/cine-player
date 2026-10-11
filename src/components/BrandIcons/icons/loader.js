// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Geometry: Lucide loader-circle (ISC, via opensvg.dev Lucide set).

const React = require('react');
const PropTypes = require('prop-types');

const Loader = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M21 12a9 9 0 1 1-6.219-8.56' }),
    );
});

Loader.displayName = 'Loader';

Loader.propTypes = {
    className: PropTypes.string
};

module.exports = Loader;
module.exports.default = Loader;
