// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Library = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('rect', { width: '8', height: '18', x: '3', y: '3', rx: '1' }),
        React.createElement('path', { d: 'M7 3v18' }),
        React.createElement('path', { d: 'M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z' }),
    );
});

Library.displayName = 'Library';

Library.propTypes = {
    className: PropTypes.string
};

module.exports = Library;
module.exports.default = Library;
