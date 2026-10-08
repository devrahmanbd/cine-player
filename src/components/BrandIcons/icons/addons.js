// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Addons = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z' }),
        React.createElement('path', { d: 'M12 8v8' }),
        React.createElement('path', { d: 'M8 12h8' }),
    );
});

Addons.displayName = 'Addons';

Addons.propTypes = {
    className: PropTypes.string
};

module.exports = Addons;
module.exports.default = Addons;
