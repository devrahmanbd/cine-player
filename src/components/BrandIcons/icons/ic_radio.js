// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const IcRadio = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M16.247 7.761a6 6 0 0 1 0 8.478' }),
        React.createElement('path', { d: 'M19.075 4.933a10 10 0 0 1 0 14.134' }),
        React.createElement('path', { d: 'M4.925 19.067a10 10 0 0 1 0-14.134' }),
        React.createElement('path', { d: 'M7.753 16.239a6 6 0 0 1 0-8.478' }),
        React.createElement('circle', { cx: '12', cy: '12', r: '2' }),
    );
});

IcRadio.displayName = 'IcRadio';

IcRadio.propTypes = {
    className: PropTypes.string
};

module.exports = IcRadio;
module.exports.default = IcRadio;
