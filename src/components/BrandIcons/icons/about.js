// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const About = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z' }),
        React.createElement('path', { d: 'M12 16v-4' }),
        React.createElement('path', { d: 'M12 8h.01' }),
    );
});

About.displayName = 'About';

About.propTypes = {
    className: PropTypes.string
};

module.exports = About;
module.exports.default = About;
