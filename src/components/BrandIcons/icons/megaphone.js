// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Megaphone = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'm3 11 18-5v12L3 14v-3z' }),
        React.createElement('path', { d: 'M11.6 16.8a3 3 0 1 1-5.8-1.6' }),
    );
});

Megaphone.displayName = 'Megaphone';

Megaphone.propTypes = {
    className: PropTypes.string
};

module.exports = Megaphone;
module.exports.default = Megaphone;
