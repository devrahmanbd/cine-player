// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const IcRadio = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M12 11s-7 0-7 7c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3 0-7-7-7-7-7zm0-8c-4.97 0-9 4.03-9 9H1l4 4 4-4H7c0-3.87 3.13-7 7-7s7 3.13 7 7h-2l4 4 4-4h-2c0-4.97-4.03-9-9-9z' }),
    );
});

IcRadio.displayName = 'IcRadio';

IcRadio.propTypes = {
    className: PropTypes.string
};

module.exports = IcRadio;
module.exports.default = IcRadio;
