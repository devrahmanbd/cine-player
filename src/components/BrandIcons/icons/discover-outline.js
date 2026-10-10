// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const DiscoverOutline = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('circle', { cx: '12', cy: '12', r: '10' }),
        React.createElement('path', { d: 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20' }),
        React.createElement('path', { d: 'M2 12h20' }),
    );
});

DiscoverOutline.displayName = 'DiscoverOutline';

DiscoverOutline.propTypes = {
    className: PropTypes.string
};

module.exports = DiscoverOutline;
module.exports.default = DiscoverOutline;
