// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const ImdbOutline = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z' }),
        React.createElement('path', { d: 'M7 9v6M11 9v6M7 12h4M14 9l3 3-3 3M14 9h3' }),
    );
});

ImdbOutline.displayName = 'ImdbOutline';

ImdbOutline.propTypes = {
    className: PropTypes.string
};

module.exports = ImdbOutline;
module.exports.default = ImdbOutline;
