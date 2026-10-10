// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Cast = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6' }),
        React.createElement('path', { d: 'M2 12a9 9 0 0 1 8 8' }),
        React.createElement('path', { d: 'M2 16a5 5 0 0 1 4 4' }),
        React.createElement('line', { x1: '2', x2: '2.01', y1: '20', y2: '20' }),
    );
});

Cast.displayName = 'Cast';

Cast.propTypes = {
    className: PropTypes.string
};

module.exports = Cast;
module.exports.default = Cast;
