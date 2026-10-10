// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

const React = require('react');
const PropTypes = require('prop-types');

const Trailer = React.forwardRef(({ className }, ref) => {
    return React.createElement(
        'svg',
        { viewBox: '0 0 24 24', className: className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ref: ref },
        React.createElement('path', { d: 'm12.296 3.464 3.02 3.956' }),
        React.createElement('path', { d: 'M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z' }),
        React.createElement('path', { d: 'M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
        React.createElement('path', { d: 'm6.18 5.276 3.1 3.899' }),
    );
});

Trailer.displayName = 'Trailer';

Trailer.propTypes = {
    className: PropTypes.string
};

module.exports = Trailer;
module.exports.default = Trailer;
