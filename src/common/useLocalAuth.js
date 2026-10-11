// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');

const initialAuthState = {
    user: null,
    loading: false,
    error: ''
};

const authReducer = (state, action) => {
    switch (action.type) {
        case 'start':
            return {
                ...state,
                loading: true,
                error: ''
            };
        case 'success':
            return {
                user: action.user,
                loading: false,
                error: ''
            };
        case 'failure':
            return {
                ...state,
                loading: false,
                error: action.error
            };
        case 'clear':
            return {
                user: null,
                loading: false,
                error: ''
            };
        default:
            return state;
    }
};

// Shared session state: every hook instance (Intro, App gate, NavMenu,
// Settings) reads and writes the same login. Without this, one surface
// logging in would leave the others showing the stale anonymous state.
let sharedState = initialAuthState;
const stateListeners = new Set();

const setSharedState = (action) => {
    sharedState = authReducer(sharedState, action);
    stateListeners.forEach((listener) => listener());
};

const readError = async (response) => {
    try {
        const data = await response.json();
        if (data !== null && typeof data === 'object' && typeof data.error === 'string' && data.error.length > 0) {
            return data.error;
        }
    } catch {
        // Fall through to the generic message below.
    }
    return 'request failed';
};

const apiRequest = async (path, body) => {
    const response = await fetch(path, {
        method: typeof body === 'undefined' ? 'GET' : 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: typeof body === 'undefined' ? undefined : JSON.stringify(body)
    });
    if (!response.ok) {
        throw new Error(await readError(response));
    }
    try {
        return await response.json();
    } catch {
        return null;
    }
};

const toUser = (data) => {
    if (data === null || typeof data !== 'object' || typeof data.email !== 'string') {
        throw new Error('request failed');
    }
    return { id: data.id, email: data.email };
};

const useLocalAuth = () => {
    const [, forceUpdate] = React.useReducer((count) => count + 1, 0);

    React.useEffect(() => {
        const listener = () => forceUpdate();
        stateListeners.add(listener);
        return () => {
            stateListeners.delete(listener);
        };
    }, []);

    const refresh = React.useCallback(async () => {
        setSharedState({ type: 'start' });
        try {
            const user = toUser(await apiRequest('/api/users/me'));
            setSharedState({ type: 'success', user });
            return user;
        } catch (error) {
            setSharedState({ type: 'failure', error: error.message });
            throw error;
        }
    }, []);

    const signup = React.useCallback(async (email, password) => {
        setSharedState({ type: 'start' });
        try {
            // No session until the email is verified: return the signup
            // receipt, keep the current user, and let the caller route to
            // the OTP confirm view.
            const data = await apiRequest('/api/users/signup', { email, password });
            setSharedState({ type: 'success', user: sharedState.user });
            return data;
        } catch (error) {
            setSharedState({ type: 'failure', error: error.message });
            throw error;
        }
    }, []);

    const verifySignup = React.useCallback(async (email, code) => {
        setSharedState({ type: 'start' });
        try {
            const user = toUser(await apiRequest('/api/users/verify', { email, code }));
            setSharedState({ type: 'success', user });
            return user;
        } catch (error) {
            setSharedState({ type: 'failure', error: error.message });
            throw error;
        }
    }, []);

    const resendCode = React.useCallback(async (email) => {
        setSharedState({ type: 'start' });
        try {
            await apiRequest('/api/users/verify/request', { email });
            setSharedState({ type: 'success', user: sharedState.user });
        } catch (error) {
            setSharedState({ type: 'failure', error: error.message });
            throw error;
        }
    }, []);

    const login = React.useCallback(async (email, password) => {
        setSharedState({ type: 'start' });
        try {
            const user = toUser(await apiRequest('/api/users/login', { email, password }));
            setSharedState({ type: 'success', user });
            return user;
        } catch (error) {
            setSharedState({ type: 'failure', error: error.message });
            throw error;
        }
    }, []);

    const logout = React.useCallback(async () => {
        setSharedState({ type: 'start' });
        try {
            await apiRequest('/api/users/logout', {});
            setSharedState({ type: 'clear' });
        } catch (error) {
            setSharedState({ type: 'failure', error: error.message });
            throw error;
        }
    }, []);

    const requestOtp = React.useCallback(async (email) => {
        setSharedState({ type: 'start' });
        try {
            await apiRequest('/api/users/password/otp/request', { email });
            setSharedState({ type: 'success', user: sharedState.user });
        } catch (error) {
            setSharedState({ type: 'failure', error: error.message });
            throw error;
        }
    }, []);

    const confirmOtp = React.useCallback(async (email, code, password) => {
        setSharedState({ type: 'start' });
        try {
            await apiRequest('/api/users/password/otp/verify', { email, code, password });
            setSharedState({ type: 'success', user: sharedState.user });
        } catch (error) {
            setSharedState({ type: 'failure', error: error.message });
            throw error;
        }
    }, []);

    React.useEffect(() => {
        refresh().catch(() => {
            // Anonymous visitors have no session; the form stays usable.
        });
    }, [refresh]);

    return {
        user: sharedState.user,
        loading: sharedState.loading,
        error: sharedState.error,
        signup,
        verifySignup,
        resendCode,
        login,
        logout,
        requestOtp,
        confirmOtp,
        refresh
    };
};

module.exports = useLocalAuth;
module.exports.authReducer = authReducer;
module.exports.initialAuthState = initialAuthState;
