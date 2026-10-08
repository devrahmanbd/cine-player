// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const IcAdult = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 13.5v-7L7.5 11l-.71-.71L10.5 7h1.5v8.5H10zm6 0V13h-2.5v-1.5H16V10h-2.5V8.5H16V7h-4v8.5h4z' }),
    );
});

IcAdult.displayName = 'IcAdult';

IcAdult.propTypes = {
    className: PropTypes.string
};

module.exports = IcAdult;
module.exports.default = IcAdult;
