// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const VideoScaleCrop = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M6 2v14a2 2 0 0 0 2 2h14' }),
        React.createElement('path', { d: 'M18 22V8a2 2 0 0 0-2-2H2' }),
    );
});

VideoScaleCrop.displayName = 'VideoScaleCrop';

VideoScaleCrop.propTypes = {
    className: PropTypes.string
};

module.exports = VideoScaleCrop;
module.exports.default = VideoScaleCrop;
