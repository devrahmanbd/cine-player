// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const HomeOutline = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
        React.createElement('path', { d: 'M9 22V12h6v10' }),
    );
});

HomeOutline.displayName = 'HomeOutline';

HomeOutline.propTypes = {
    className: PropTypes.string
};

module.exports = HomeOutline;
module.exports.default = HomeOutline;
