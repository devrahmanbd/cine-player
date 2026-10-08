// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const CaretDown = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M7 10l5 5 5-5z' }),
    );
});

CaretDown.displayName = 'CaretDown';

CaretDown.propTypes = {
    className: PropTypes.string
};

module.exports = CaretDown;
module.exports.default = CaretDown;
