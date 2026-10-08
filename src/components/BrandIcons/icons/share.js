// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Share = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('circle', { cx: '18', cy: '5', r: '3' }),
        React.createElement('circle', { cx: '6', cy: '12', r: '3' }),
        React.createElement('circle', { cx: '18', cy: '19', r: '3' }),
        React.createElement('path', { d: 'm8.59 13.51 6.83 3.98' }),
        React.createElement('path', { d: 'm15.41 6.51-6.82 3.98' }),
    );
});

Share.displayName = 'Share';

Share.propTypes = {
    className: PropTypes.string
};

module.exports = Share;
module.exports.default = Share;
