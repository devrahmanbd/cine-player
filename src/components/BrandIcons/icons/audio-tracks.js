// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const AudioTracks = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M2 10v3' }),
        React.createElement('path', { d: 'M6 6v11' }),
        React.createElement('path', { d: 'M10 3v18' }),
        React.createElement('path', { d: 'M14 8v7' }),
        React.createElement('path', { d: 'M18 5v13' }),
        React.createElement('path', { d: 'M22 10v3' }),
    );
});

AudioTracks.displayName = 'AudioTracks';

AudioTracks.propTypes = {
    className: PropTypes.string
};

module.exports = AudioTracks;
module.exports.default = AudioTracks;
