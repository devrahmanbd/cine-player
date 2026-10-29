// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, test, expect */

const { canShowPopup } = require('../popupState');

describe('NewsletterPopup visibility', () => {
    test('shows when not dismissed and no other modal is open', () => {
        expect(canShowPopup({ dismissed: false, openModals: 0 })).toBe(true);
    });

    test('hidden while another modal (e.g. onboarding) is open', () => {
        // react-focus-lock inside the other modal steals focus from the
        // popup's email input, making it impossible to type into.
        expect(canShowPopup({ dismissed: false, openModals: 1 })).toBe(false);
        expect(canShowPopup({ dismissed: false, openModals: 3 })).toBe(false);
    });

    test('hidden once dismissed in this browser', () => {
        expect(canShowPopup({ dismissed: true, openModals: 0 })).toBe(false);
        expect(canShowPopup({ dismissed: true, openModals: 1 })).toBe(false);
    });
});
