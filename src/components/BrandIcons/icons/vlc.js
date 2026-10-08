// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Vlc = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'currentColor', stroke: 'none', ref: ref },
        React.createElement('path', { d: 'M12 2 6 8v2.5L2 22h20l-4-11.5V8l-6-6z' }),
        React.createElement('path', { d: 'M7.5 13h9l1.2 3.5H6.3z', fill: 'none', stroke: '#fff', strokeWidth: '0.8' }),
        React.createElement('path', { d: 'M9 8h6v2H9z', fill: 'none', stroke: '#fff', strokeWidth: '0.8' }),
    );
});

Vlc.displayName = 'Vlc';

Vlc.propTypes = {
    className: PropTypes.string
};

module.exports = Vlc;
module.exports.default = Vlc;
