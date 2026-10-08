// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Imdb = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M.038 1.871h7.943v11.484H6.303V4.112H4.498v9.243H2.691V4.112H.038V1.871zm9.015 0h2.326l1.368 7.243 1.369-7.243h2.325v11.484h-1.417V5.007l-1.25 6.216h-1.87l-1.25-6.216v8.348H9.053V1.871zm7.551 0h2.689v9.242h1.805V4.112h1.873v9.243h1.806V1.871h-8.173v11.484z' }),
    );
});

Imdb.displayName = 'Imdb';

Imdb.propTypes = {
    className: PropTypes.string
};

module.exports = Imdb;
module.exports.default = Imdb;
