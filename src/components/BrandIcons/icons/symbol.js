// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Symbol = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z' }),
        React.createElement('rect', { x: '3', y: '14', width: '7', height: '7', rx: '1' }),
        React.createElement('circle', { cx: '17.5', cy: '17.5', r: '3.5' }),
    );
});

Symbol.displayName = 'Symbol';

Symbol.propTypes = {
    className: PropTypes.string
};

module.exports = Symbol;
module.exports.default = Symbol;
