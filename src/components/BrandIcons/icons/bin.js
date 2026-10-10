// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Bin = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M10 11v6' }),
        React.createElement('path', { d: 'M14 11v6' }),
        React.createElement('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }),
        React.createElement('path', { d: 'M3 6h18' }),
        React.createElement('path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }),
    );
});

Bin.displayName = 'Bin';

Bin.propTypes = {
    className: PropTypes.string
};

module.exports = Bin;
module.exports.default = Bin;
