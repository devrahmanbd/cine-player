// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const CalendarThin = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M16 14v2.2l1.6 1' }),
        React.createElement('path', { d: 'M16 2v3' }),
        React.createElement('path', { d: 'M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338' }),
        React.createElement('path', { d: 'M3 9h5.859' }),
        React.createElement('path', { d: 'M8 2v3' }),
        React.createElement('circle', { cx: '16', cy: '16', r: '6' }),
    );
});

CalendarThin.displayName = 'CalendarThin';

CalendarThin.propTypes = {
    className: PropTypes.string
};

module.exports = CalendarThin;
module.exports.default = CalendarThin;
