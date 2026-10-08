// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const ChevronBack = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'm15 18-6-6 6-6' }),
    );
});

ChevronBack.displayName = 'ChevronBack';

ChevronBack.propTypes = {
    className: PropTypes.string
};

module.exports = ChevronBack;
module.exports.default = ChevronBack;
