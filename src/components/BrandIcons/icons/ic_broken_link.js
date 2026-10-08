// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const IcBrokenLink = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M17 7h-4v1.5h4c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-1v1.5h1c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7 11H3c-.55 0-1 .45-1 1s.45 1 1 1h1v1.5H3c-1.66 0-3-1.34-3-3s1.34-3 3-3h4v1.5zm2-5v1.5H7c-1.66 0-3 1.34-3 3v.5h1.5v-.5c0-.83.67-1.5 1.5-1.5h2zm10 6.5l-1.5-1.5-1.5 1.5 1.5 1.5 1.5-1.5zm-6 4l-1.5-1.5-1.5 1.5 1.5 1.5 1.5-1.5z' }),
    );
});

IcBrokenLink.displayName = 'IcBrokenLink';

IcBrokenLink.propTypes = {
    className: PropTypes.string
};

module.exports = IcBrokenLink;
module.exports.default = IcBrokenLink;
