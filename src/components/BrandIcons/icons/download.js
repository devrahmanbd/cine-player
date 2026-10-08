// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Download = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
        React.createElement('path', { d: 'm7 10 5 5 5-5' }),
        React.createElement('path', { d: 'M12 15V3' }),
    );
});

Download.displayName = 'Download';

Download.propTypes = {
    className: PropTypes.string
};

module.exports = Download;
module.exports.default = Download;
