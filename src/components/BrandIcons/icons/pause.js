// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Pause = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('rect', { x: '14', y: '3', width: '5', height: '18', rx: '1' }),
        React.createElement('rect', { x: '5', y: '3', width: '5', height: '18', rx: '1' }),
    );
});

Pause.displayName = 'Pause';

Pause.propTypes = {
    className: PropTypes.string
};

module.exports = Pause;
module.exports.default = Pause;
