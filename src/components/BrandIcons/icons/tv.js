// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Tv = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'm17 2-5 5-5-5' }),
        React.createElement('rect', { width: '20', height: '15', x: '2', y: '7', rx: '2' }),
    );
});

Tv.displayName = 'Tv';

Tv.propTypes = {
    className: PropTypes.string
};

module.exports = Tv;
module.exports.default = Tv;
