// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const SettingsOutline = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'M11 10.27 7 3.34' }),
        React.createElement('path', { d: 'm11 13.73-4 6.93' }),
        React.createElement('path', { d: 'M12 22v-2' }),
        React.createElement('path', { d: 'M12 2v2' }),
        React.createElement('path', { d: 'M14 12h8' }),
        React.createElement('path', { d: 'm17 20.66-1-1.73' }),
        React.createElement('path', { d: 'm17 3.34-1 1.73' }),
        React.createElement('path', { d: 'M2 12h2' }),
        React.createElement('path', { d: 'm20.66 17-1.73-1' }),
        React.createElement('path', { d: 'm20.66 7-1.73 1' }),
        React.createElement('path', { d: 'm3.34 17 1.73-1' }),
        React.createElement('path', { d: 'm3.34 7 1.73 1' }),
        React.createElement('circle', { cx: '12', cy: '12', r: '2' }),
        React.createElement('circle', { cx: '12', cy: '12', r: '8' }),
    );
});

SettingsOutline.displayName = 'SettingsOutline';

SettingsOutline.propTypes = {
    className: PropTypes.string
};

module.exports = SettingsOutline;
module.exports.default = SettingsOutline;
