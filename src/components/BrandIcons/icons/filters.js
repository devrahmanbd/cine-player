// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Filters = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M22 3H2l8 9.46V19l4 2v-8.54z' }),
    );
});

Filters.displayName = 'Filters';

Filters.propTypes = {
    className: PropTypes.string
};

module.exports = Filters;
module.exports.default = Filters;
