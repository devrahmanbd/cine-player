// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Remote = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M5 7h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z' }),
        React.createElement('path', { d: 'M12 11h.01' }),
        React.createElement('path', { d: 'M9 11h.01' }),
        React.createElement('path', { d: 'M15 11h.01' }),
        React.createElement('path', { d: 'M9 15h6' }),
    );
});

Remote.displayName = 'Remote';

Remote.propTypes = {
    className: PropTypes.string
};

module.exports = Remote;
module.exports.default = Remote;
