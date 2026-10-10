// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Glasses = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('circle', { cx: '6', cy: '15', r: '4' }),
        React.createElement('circle', { cx: '18', cy: '15', r: '4' }),
        React.createElement('path', { d: 'M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2' }),
        React.createElement('path', { d: 'M2.5 13 5 7c.7-1.3 1.4-2 3-2' }),
        React.createElement('path', { d: 'M21.5 13 19 7c-.7-1.3-1.5-2-3-2' }),
    );
});

Glasses.displayName = 'Glasses';

Glasses.propTypes = {
    className: PropTypes.string
};

module.exports = Glasses;
module.exports.default = Glasses;
