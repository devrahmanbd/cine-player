// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const IcBrokenLink = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'm18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71' }),
        React.createElement('path', { d: 'm5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71' }),
        React.createElement('line', { x1: '8', x2: '8', y1: '2', y2: '5' }),
        React.createElement('line', { x1: '2', x2: '5', y1: '8', y2: '8' }),
        React.createElement('line', { x1: '16', x2: '16', y1: '19', y2: '22' }),
        React.createElement('line', { x1: '19', x2: '22', y1: '16', y2: '16' }),
    );
});

IcBrokenLink.displayName = 'IcBrokenLink';

IcBrokenLink.propTypes = {
    className: PropTypes.string
};

module.exports = IcBrokenLink;
module.exports.default = IcBrokenLink;
