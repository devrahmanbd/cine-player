// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Episodes = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M21 5H3' }),
        React.createElement('path', { d: 'M10 12H3' }),
        React.createElement('path', { d: 'M10 19H3' }),
        React.createElement('path', { d: 'M15 12.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997a1 1 0 0 1-1.517-.86z' }),
    );
});

Episodes.displayName = 'Episodes';

Episodes.propTypes = {
    className: PropTypes.string
};

module.exports = Episodes;
module.exports.default = Episodes;
