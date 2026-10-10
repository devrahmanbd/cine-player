// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const PersonOutline = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('circle', { cx: '12', cy: '8', r: '5' }),
        React.createElement('path', { d: 'M20 21a8 8 0 0 0-16 0' }),
    );
});

PersonOutline.displayName = 'PersonOutline';

PersonOutline.propTypes = {
    className: PropTypes.string
};

module.exports = PersonOutline;
module.exports.default = PersonOutline;
