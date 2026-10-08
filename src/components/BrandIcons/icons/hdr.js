// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Hdr = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z' }),
        React.createElement('path', { d: 'M7 9v6M11 9v6M7 12h4M14 9h2.5a2 2 0 0 1 0 4H14v-4zM14 13l2.5 2', fill: 'none', stroke: '#fff', strokeWidth: '1.2' }),
    );
});

Hdr.displayName = 'Hdr';

Hdr.propTypes = {
    className: PropTypes.string
};

module.exports = Hdr;
module.exports.default = Hdr;
