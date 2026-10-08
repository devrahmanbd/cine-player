// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Search = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z' }),
        React.createElement('path', { d: 'm21 21-4.3-4.3' }),
    );
});

Search.displayName = 'Search';

Search.propTypes = {
    className: PropTypes.string
};

module.exports = Search;
module.exports.default = Search;
