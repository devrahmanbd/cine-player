// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Details = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' }),
        React.createElement('path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }),
        React.createElement('path', { d: 'M10 9H8' }),
        React.createElement('path', { d: 'M16 13H8' }),
        React.createElement('path', { d: 'M16 17H8' }),
    );
});

Details.displayName = 'Details';

Details.propTypes = {
    className: PropTypes.string
};

module.exports = Details;
module.exports.default = Details;
