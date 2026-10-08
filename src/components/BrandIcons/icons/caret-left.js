// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const CaretLeft = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M14 6l-6 6 6 6z' }),
    );
});

CaretLeft.displayName = 'CaretLeft';

CaretLeft.propTypes = {
    className: PropTypes.string
};

module.exports = CaretLeft;
module.exports.default = CaretLeft;
