// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const AddToLibrary = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'm16 6 4 14' }),
        React.createElement('path', { d: 'M12 6v14' }),
        React.createElement('path', { d: 'M8 8v12' }),
        React.createElement('path', { d: 'M4 4v16' }),
        React.createElement('path', { d: 'M18 3v6' }),
        React.createElement('path', { d: 'M15 6h6' }),
    );
});

AddToLibrary.displayName = 'AddToLibrary';

AddToLibrary.propTypes = {
    className: PropTypes.string
};

module.exports = AddToLibrary;
module.exports.default = AddToLibrary;
