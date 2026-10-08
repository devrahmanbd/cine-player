// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Actors = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }),
        React.createElement('path', { d: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' }),
        React.createElement('path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }),
        React.createElement('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }),
    );
});

Actors.displayName = 'Actors';

Actors.propTypes = {
    className: PropTypes.string
};

module.exports = Actors;
module.exports.default = Actors;
