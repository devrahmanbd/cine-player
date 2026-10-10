// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const VideoScaleFit = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'm15 15 6 6' }),
        React.createElement('path', { d: 'm15 9 6-6' }),
        React.createElement('path', { d: 'M21 16v5h-5' }),
        React.createElement('path', { d: 'M21 8V3h-5' }),
        React.createElement('path', { d: 'M3 16v5h5' }),
        React.createElement('path', { d: 'm3 21 6-6' }),
        React.createElement('path', { d: 'M3 8V3h5' }),
        React.createElement('path', { d: 'M9 9 3 3' }),
    );
});

VideoScaleFit.displayName = 'VideoScaleFit';

VideoScaleFit.propTypes = {
    className: PropTypes.string
};

module.exports = VideoScaleFit;
module.exports.default = VideoScaleFit;
