// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const VideoScaleStretch = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z' }),
        React.createElement('path', { d: 'M12 4v16' }),
        React.createElement('path', { d: 'm8 8-4 4 4 4' }),
        React.createElement('path', { d: 'm16 8 4 4-4 4' }),
    );
});

VideoScaleStretch.displayName = 'VideoScaleStretch';

VideoScaleStretch.propTypes = {
    className: PropTypes.string
};

module.exports = VideoScaleStretch;
module.exports.default = VideoScaleStretch;
