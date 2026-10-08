// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const VideoScaleFit = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M8 3H5a2 2 0 0 0-2 2v3' }),
        React.createElement('path', { d: 'M21 8V5a2 2 0 0 0-2-2h-3' }),
        React.createElement('path', { d: 'M3 16v3a2 2 0 0 0 2 2h3' }),
        React.createElement('path', { d: 'M16 21h3a2 2 0 0 0 2-2v-3' }),
    );
});

VideoScaleFit.displayName = 'VideoScaleFit';

VideoScaleFit.propTypes = {
    className: PropTypes.string
};

module.exports = VideoScaleFit;
module.exports.default = VideoScaleFit;
