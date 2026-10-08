// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Speed = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'm12 14 4-4' }),
        React.createElement('path', { d: 'M3.34 19a10 10 0 1 1 17.32 0' }),
    );
});

Speed.displayName = 'Speed';

Speed.propTypes = {
    className: PropTypes.string
};

module.exports = Speed;
module.exports.default = Speed;
