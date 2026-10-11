// Copyright (C) 2017-2023 Smart code 203358507
/* global describe, test, expect */

const { authReducer, initialAuthState } = require('./useLocalAuth');

describe('useLocalAuth reducer', () => {
    test('initial state is logged out and idle', () => {
        expect(initialAuthState).toEqual({ user: null, loading: false, error: '' });
    });

    test('start transitions to loading and clears error', () => {
        const state = authReducer({ user: null, loading: false, error: 'boom' }, { type: 'start' });
        expect(state).toEqual({ user: null, loading: true, error: '' });
    });

    test('success stores the user and clears loading/error', () => {
        const user = { id: 1, email: 'ann@example.com' };
        const state = authReducer({ user: null, loading: true, error: '' }, { type: 'success', user });
        expect(state).toEqual({ user, loading: false, error: '' });
    });

    test('failure stores the error and clears loading', () => {
        const state = authReducer(
            { user: null, loading: true, error: '' },
            { type: 'failure', error: 'invalid credentials' }
        );
        expect(state).toEqual({ user: null, loading: false, error: 'invalid credentials' });
    });

    test('clear logs out the user', () => {
        const state = authReducer(
            { user: { id: 1, email: 'ann@example.com' }, loading: false, error: '' },
            { type: 'clear' }
        );
        expect(state).toEqual({ user: null, loading: false, error: '' });
    });

    test('unknown actions return the current state', () => {
        const state = { user: null, loading: false, error: '' };
        expect(authReducer(state, { type: 'nope' })).toBe(state);
    });
});
