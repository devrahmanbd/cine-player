// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Network = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('rect', { x: '16', y: '16', width: '6', height: '6', rx: '1' }),
        React.createElement('rect', { x: '2', y: '16', width: '6', height: '6', rx: '1' }),
        React.createElement('rect', { x: '9', y: '2', width: '6', height: '6', rx: '1' }),
        React.createElement('path', { d: 'M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3' }),
        React.createElement('path', { d: 'M12 12V8' }),
    );
});

Network.displayName = 'Network';

Network.propTypes = {
    className: PropTypes.string
};

module.exports = Network;
module.exports.default = Network;
