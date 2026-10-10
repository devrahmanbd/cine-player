// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Hdr = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('circle', { cx: '12', cy: '12', r: '10' }),
        React.createElement('path', { d: 'm14.31 8 5.74 9.94' }),
        React.createElement('path', { d: 'M9.69 8h11.48' }),
        React.createElement('path', { d: 'm7.38 12 5.74-9.94' }),
        React.createElement('path', { d: 'M9.69 16 3.95 6.06' }),
        React.createElement('path', { d: 'M14.31 16H2.83' }),
        React.createElement('path', { d: 'm16.62 12-5.74 9.94' }),
    );
});

Hdr.displayName = 'Hdr';

Hdr.propTypes = {
    className: PropTypes.string
};

module.exports = Hdr;
module.exports.default = Hdr;
