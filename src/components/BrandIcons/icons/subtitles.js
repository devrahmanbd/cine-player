// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Subtitles = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('rect', { width: '18', height: '14', x: '3', y: '5', rx: '2', ry: '2' }),
        React.createElement('path', { d: 'M7 15h4M15 15h2M7 11h2M13 11h4' }),
    );
});

Subtitles.displayName = 'Subtitles';

Subtitles.propTypes = {
    className: PropTypes.string
};

module.exports = Subtitles;
module.exports.default = Subtitles;
