// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Minimize = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M8 3v3a2 2 0 0 1-2 2H3' }),
        React.createElement('path', { d: 'M21 8h-3a2 2 0 0 1-2-2V3' }),
        React.createElement('path', { d: 'M3 16h3a2 2 0 0 1 2 2v3' }),
        React.createElement('path', { d: 'M16 21v-3a2 2 0 0 1 2-2h3' }),
    );
});

Minimize.displayName = 'Minimize';

Minimize.propTypes = {
    className: PropTypes.string
};

module.exports = Minimize;
module.exports.default = Minimize;
