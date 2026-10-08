// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Movies = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M7 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2' }),
        React.createElement('path', { d: 'M17 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2' }),
        React.createElement('path', { d: 'M7 4v16' }),
        React.createElement('path', { d: 'M17 4v16' }),
        React.createElement('path', { d: 'M3 8h4' }),
        React.createElement('path', { d: 'M3 12h18' }),
        React.createElement('path', { d: 'M3 16h4' }),
        React.createElement('path', { d: 'M17 8h4' }),
        React.createElement('path', { d: 'M17 16h4' }),
    );
});

Movies.displayName = 'Movies';

Movies.propTypes = {
    className: PropTypes.string
};

module.exports = Movies;
module.exports.default = Movies;
