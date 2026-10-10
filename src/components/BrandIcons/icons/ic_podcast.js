// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const IcPodcast = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M12 17v4' }),
        React.createElement('path', { d: 'M18 11a6 6 0 00-3-5.197' }),
        React.createElement('path', { d: 'M2 11a10 10 0 015-8.662' }),
        React.createElement('path', { d: 'M22 11a10 10 0 00-5-8.662' }),
        React.createElement('path', { d: 'M6 11a6 6 0 013-5.197' }),
        React.createElement('path', { d: 'M9 21h6' }),
        React.createElement('rect', { x: '10', y: '9', width: '4', height: '8', rx: '2' }),
    );
});

IcPodcast.displayName = 'IcPodcast';

IcPodcast.propTypes = {
    className: PropTypes.string
};

module.exports = IcPodcast;
module.exports.default = IcPodcast;
