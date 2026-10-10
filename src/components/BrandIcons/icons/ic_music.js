// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const IcMusic = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M9 18V5l12-2v13' }),
        React.createElement('circle', { cx: '6', cy: '18', r: '3' }),
        React.createElement('circle', { cx: '18', cy: '16', r: '3' }),
    );
});

IcMusic.displayName = 'IcMusic';

IcMusic.propTypes = {
    className: PropTypes.string
};

module.exports = IcMusic;
module.exports.default = IcMusic;
