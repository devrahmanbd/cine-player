// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Close = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M18 6 6 18' }),
        React.createElement('path', { d: 'm6 6 12 12' }),
    );
});

Close.displayName = 'Close';

Close.propTypes = {
    className: PropTypes.string
};

module.exports = Close;
module.exports.default = Close;
