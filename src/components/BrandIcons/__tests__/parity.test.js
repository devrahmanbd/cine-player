// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, test, expect */

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const BrandIcon = require('../index');
const ICONS = BrandIcon.ICONS;

describe('BrandIcons parity', () => {
    test('map is complete', () => {
        const names = Object.keys(ICONS);
        expect(names.length).toBeGreaterThan(80);
        expect(ICONS['home']).toBeDefined();
        expect(ICONS['search']).toBeDefined();
        expect(ICONS['play']).toBeDefined();
        expect(ICONS['volume-high']).toBeDefined();
        expect(ICONS['video-scale-fit']).toBeDefined();
    });

    test('each mapped name renders an svg with at least one graphic element', () => {
        const names = Object.keys(ICONS);
        names.forEach((name) => {
            const html = renderToStaticMarkup(React.createElement(BrandIcon, { name: name, className: 'test-icon' }));
            expect(html).toContain('<svg');
            // Genuine upstream geometry is not always <path>: e.g. Lucide
            // ellipsis/ellipsis-vertical are circle-only, pause and
            // stretch-horizontal are rect-only. Accept any SVG shape element.
            expect(/<(path|circle|rect|line|polyline|polygon|ellipse)[\s>]/.test(html)).toBe(true);
        });
    });

    test('forwards className', () => {
        const html = renderToStaticMarkup(React.createElement(BrandIcon, { name: 'search', className: 'my-class' }));
        expect(html).toContain('my-class');
    });

    test('unknown name renders null', () => {
        const html = renderToStaticMarkup(React.createElement(BrandIcon, { name: '__unknown_icon__' }));
        expect(html).toBe('');
    });
});
