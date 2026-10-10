// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Share = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M12 2v13' }),
        React.createElement('path', { d: 'm16 6-4-4-4 4' }),
        React.createElement('path', { d: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8' }),
    );
});

Share.displayName = 'Share';

Share.propTypes = {
    className: PropTypes.string
};

module.exports = Share;
module.exports.default = Share;
