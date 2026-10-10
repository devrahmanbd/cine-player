// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Calendar = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M8 2v3' }),
        React.createElement('path', { d: 'M16 2v3' }),
        React.createElement('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }),
        React.createElement('path', { d: 'M3 9h18' }),
    );
});

Calendar.displayName = 'Calendar';

Calendar.propTypes = {
    className: PropTypes.string
};

module.exports = Calendar;
module.exports.default = Calendar;
