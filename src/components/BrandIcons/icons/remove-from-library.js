// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const RemoveFromLibrary = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M15 10H9' }),
        React.createElement('path', { d: 'M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z' }),
    );
});

RemoveFromLibrary.displayName = 'RemoveFromLibrary';

RemoveFromLibrary.propTypes = {
    className: PropTypes.string
};

module.exports = RemoveFromLibrary;
module.exports.default = RemoveFromLibrary;
