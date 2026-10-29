// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
const { AD_TYPES, typeActive, togglePlan } = require('../adTypes');

const SLOT_KEYS = [
    'popunder',
    'socialbar',
    'native',
    'banner_728x90',
    'banner_468x60',
    'banner_300x250',
    'banner_160x600',
    'banner_160x300',
    'banner_320x50',
    'smartlink',
];

describe('adTypes', () => {
    it('covers every slot exactly once', () => {
        const union = AD_TYPES.flatMap((t) => t.slots).sort();
        expect(union).toEqual([...SLOT_KEYS].sort());
        expect(AD_TYPES.map((t) => t.key)).toEqual(['popunder', 'socialbar', 'native', 'banners', 'smartlink']);
    });

    it('typeActive: none/one/all', () => {
        const bannerKeys = AD_TYPES.find((t) => t.key === 'banners').slots;
        const mk = (enabledVals) => bannerKeys.map((k, i) => ({ slot_key: k, enabled: enabledVals[i] }));
        expect(typeActive(mk([0, 0, 0, 0, 0, 0]), 'banners')).toBe(false);
        expect(typeActive(mk([1, 0, 0, 0, 0, 0]), 'banners')).toBe(true);
        expect(typeActive(mk([1, 1, 1, 1, 1, 1]), 'banners')).toBe(true);
    });

    it('togglePlan: off -> all 1', () => {
        const bannerKeys = AD_TYPES.find((t) => t.key === 'banners').slots;
        const slots = bannerKeys.map((k) => ({ slot_key: k, enabled: 0 }));
        const plan = togglePlan(slots, 'banners');
        expect(Object.keys(plan).sort()).toEqual([...bannerKeys].sort());
        for (const k of bannerKeys) expect(plan[k]).toBe(1);
    });

    it('togglePlan: on -> all 0 and mixed normalizes to all 0', () => {
        const bannerKeys = AD_TYPES.find((t) => t.key === 'banners').slots;
        const mk = (enabledVals) => bannerKeys.map((k, i) => ({ slot_key: k, enabled: enabledVals[i] }));
        for (const plan of [togglePlan(mk([1, 1, 1, 1, 1, 1]), 'banners'), togglePlan(mk([1, 1, 0, 0, 0, 0]), 'banners')]) {
            for (const k of bannerKeys) expect(plan[k]).toBe(0);
        }
    });
});
