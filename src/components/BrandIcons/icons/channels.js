// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Channels = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M5 12.55a11 11 0 0 1 14.08 0' }),
        React.createElement('path', { d: 'M1.42 9a16 16 0 0 1 21.16 0' }),
        React.createElement('path', { d: 'M8.53 16.11a6 6 0 0 1 6.95 0' }),
        React.createElement('path', { d: 'M12 20h.01' }),
    );
});

Channels.displayName = 'Channels';

Channels.propTypes = {
    className: PropTypes.string
};

module.exports = Channels;
module.exports.default = Channels;
