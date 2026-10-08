// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const IcBook = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v6l-1-.75L9 10V4zm9 16H6V4h1v9l3-2.25L13 13V4h5v16z' }),
    );
});

IcBook.displayName = 'IcBook';

IcBook.propTypes = {
    className: PropTypes.string
};

module.exports = IcBook;
module.exports.default = IcBook;
