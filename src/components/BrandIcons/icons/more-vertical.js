// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const MoreVertical = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('circle', { cx: '12', cy: '12', r: '1' }),
        React.createElement('circle', { cx: '12', cy: '5', r: '1' }),
        React.createElement('circle', { cx: '12', cy: '19', r: '1' }),
    );
});

MoreVertical.displayName = 'MoreVertical';

MoreVertical.propTypes = {
    className: PropTypes.string
};

module.exports = MoreVertical;
module.exports.default = MoreVertical;
