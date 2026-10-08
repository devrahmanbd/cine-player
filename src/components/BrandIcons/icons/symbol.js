// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Symbol = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M18 7V4H6l6 8-6 8h12v-3' }),
    );
});

Symbol.displayName = 'Symbol';

Symbol.propTypes = {
    className: PropTypes.string
};

module.exports = Symbol;
module.exports.default = Symbol;
