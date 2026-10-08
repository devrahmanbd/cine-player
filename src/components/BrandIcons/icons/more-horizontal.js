// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const MoreHorizontal = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M5 12h.01' }),
        React.createElement('path', { d: 'M12 12h.01' }),
        React.createElement('path', { d: 'M19 12h.01' }),
    );
});

MoreHorizontal.displayName = 'MoreHorizontal';

MoreHorizontal.propTypes = {
    className: PropTypes.string
};

module.exports = MoreHorizontal;
module.exports.default = MoreHorizontal;
