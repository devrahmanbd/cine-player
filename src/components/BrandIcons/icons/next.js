// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Next = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M5 4l10 8-10 8V4z' }),
        React.createElement('path', { d: 'M19 5v14' }),
    );
});

Next.displayName = 'Next';

Next.propTypes = {
    className: PropTypes.string
};

module.exports = Next;
module.exports.default = Next;
