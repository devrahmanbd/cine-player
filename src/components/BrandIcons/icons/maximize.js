// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Maximize = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M15 3h6v6' }),
        React.createElement('path', { d: 'M9 21H3v-6' }),
        React.createElement('path', { d: 'm21 3-7 7' }),
        React.createElement('path', { d: 'm3 21 7-7' }),
    );
});

Maximize.displayName = 'Maximize';

Maximize.propTypes = {
    className: PropTypes.string
};

module.exports = Maximize;
module.exports.default = Maximize;
