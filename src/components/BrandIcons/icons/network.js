// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Network = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('circle', { cx: '12', cy: '5', r: '2' }),
        React.createElement('circle', { cx: '5', cy: '19', r: '2' }),
        React.createElement('circle', { cx: '19', cy: '19', r: '2' }),
        React.createElement('path', { d: 'M12 7v2a2 2 0 0 1-2 2H7' }),
        React.createElement('path', { d: 'M12 7v2a2 2 0 0 0 2 2h3' }),
        React.createElement('path', { d: 'M5 17v-1a2 2 0 0 1 2-2h2' }),
        React.createElement('path', { d: 'M19 17v-1a2 2 0 0 0-2-2h-2' }),
    );
});

Network.displayName = 'Network';

Network.propTypes = {
    className: PropTypes.string
};

module.exports = Network;
module.exports.default = Network;
