// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Pause = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M6 4h4v16H6z' }),
        React.createElement('path', { d: 'M14 4h4v16h-4z' }),
    );
});

Pause.displayName = 'Pause';

Pause.propTypes = {
    className: PropTypes.string
};

module.exports = Pause;
module.exports.default = Pause;
