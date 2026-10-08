// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Checkmark = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M20 6 9 17l-5-5' }),
    );
});

Checkmark.displayName = 'Checkmark';

Checkmark.propTypes = {
    className: PropTypes.string
};

module.exports = Checkmark;
module.exports.default = Checkmark;
