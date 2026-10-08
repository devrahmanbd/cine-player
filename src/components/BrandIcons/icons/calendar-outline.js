// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const CalendarOutline = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M8 2v4' }),
        React.createElement('path', { d: 'M16 2v4' }),
        React.createElement('path', { d: 'M3 10h18' }),
        React.createElement('path', { d: 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z' }),
    );
});

CalendarOutline.displayName = 'CalendarOutline';

CalendarOutline.propTypes = {
    className: PropTypes.string
};

module.exports = CalendarOutline;
module.exports.default = CalendarOutline;
