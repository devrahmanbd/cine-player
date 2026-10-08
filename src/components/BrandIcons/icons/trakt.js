// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Trakt = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M5.214 2.337 21.333 6.5l-4.083 2.083-3.792-1.083-2.333 3.75 2.603 6.123-3.231 4.59-6.063-9.699L0 13.382l5.214-11.045zm3.536 6.913-2.75 5.75 3.75 5.75 2-2.75-1.75-4.25 1.5-2.75-2.75-1.75z' }),
    );
});

Trakt.displayName = 'Trakt';

Trakt.propTypes = {
    className: PropTypes.string
};

module.exports = Trakt;
module.exports.default = Trakt;
