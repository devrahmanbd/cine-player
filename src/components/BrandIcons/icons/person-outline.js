// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const PersonOutline = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' }),
        React.createElement('path', { d: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' }),
    );
});

PersonOutline.displayName = 'PersonOutline';

PersonOutline.propTypes = {
    className: PropTypes.string
};

module.exports = PersonOutline;
module.exports.default = PersonOutline;
