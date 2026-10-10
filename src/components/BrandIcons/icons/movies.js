// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Movies = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('rect', { width: '18', height: '18', x: '3', y: '3', rx: '2' }),
        React.createElement('path', { d: 'M7 3v18' }),
        React.createElement('path', { d: 'M3 7.5h4' }),
        React.createElement('path', { d: 'M3 12h18' }),
        React.createElement('path', { d: 'M3 16.5h4' }),
        React.createElement('path', { d: 'M17 3v18' }),
        React.createElement('path', { d: 'M17 7.5h4' }),
        React.createElement('path', { d: 'M17 16.5h4' }),
    );
});

Movies.displayName = 'Movies';

Movies.propTypes = {
    className: PropTypes.string
};

module.exports = Movies;
module.exports.default = Movies;
