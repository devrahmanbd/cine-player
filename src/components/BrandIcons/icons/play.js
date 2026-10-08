// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Play = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M6 4l14 8-14 8V4z' }),
    );
});

Play.displayName = 'Play';

Play.propTypes = {
    className: PropTypes.string
};

module.exports = Play;
module.exports.default = Play;
