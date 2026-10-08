// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Episodes = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z' }),
        React.createElement('path', { d: 'm10 9 5 3-5 3V9z' }),
    );
});

Episodes.displayName = 'Episodes';

Episodes.propTypes = {
    className: PropTypes.string
};

module.exports = Episodes;
module.exports.default = Episodes;
