// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const VideoScaleStretch = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('rect', { width: '20', height: '6', x: '2', y: '4', rx: '2' }),
        React.createElement('rect', { width: '20', height: '6', x: '2', y: '14', rx: '2' }),
    );
});

VideoScaleStretch.displayName = 'VideoScaleStretch';

VideoScaleStretch.propTypes = {
    className: PropTypes.string
};

module.exports = VideoScaleStretch;
module.exports.default = VideoScaleStretch;
