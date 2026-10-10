// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const IcAdult = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' }),
        React.createElement('circle', { cx: '12', cy: '7', r: '4' }),
    );
});

IcAdult.displayName = 'IcAdult';

IcAdult.propTypes = {
    className: PropTypes.string
};

module.exports = IcAdult;
module.exports.default = IcAdult;
