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
    const [state, dispatch] = React.useReducer(authReducer, initialAuthState);

    const refresh = React.useCallback(async () => {
        dispatch({ type: 'start' });
        try {
            const user = toUser(await apiRequest('/api/users/me'));
            dispatch({ type: 'success', user });
            return user;
        } catch (error) {
            dispatch({ type: 'failure', error: error.message });
            throw error;
        }
    }, []);

    const signup = React.useCallback(async (email, password) => {
        dispatch({ type: 'start' });
        try {
            const user = toUser(await apiRequest('/api/users/signup', { email, password }));
            dispatch({ type: 'success', user });
            return user;
        } catch (error) {
            dispatch({ type: 'failure', error: error.message });
            throw error;
        }
    }, []);

    const login = React.useCallback(async (email, password) => {
        dispatch({ type: 'start' });
        try {
            const user = toUser(await apiRequest('/api/users/login', { email, password }));
            dispatch({ type: 'success', user });
            return user;
        } catch (error) {
            dispatch({ type: 'failure', error: error.message });
            throw error;
        }
    }, []);

    const logout = React.useCallback(async () => {
        dispatch({ type: 'start' });
        try {
            await apiRequest('/api/users/logout', {});
            dispatch({ type: 'clear' });
        } catch (error) {
            dispatch({ type: 'failure', error: error.message });
            throw error;
        }
    }, []);

    const requestOtp = React.useCallback(async (email) => {
        dispatch({ type: 'start' });
        try {
            await apiRequest('/api/users/password/otp/request', { email });
            dispatch({ type: 'success', user: state.user });
        } catch (error) {
            dispatch({ type: 'failure', error: error.message });
            throw error;
        }
    }, [state.user]);

    const confirmOtp = React.useCallback(async (email, code, password) => {
        dispatch({ type: 'start' });
        try {
            await apiRequest('/api/users/password/otp/verify', { email, code, password });
            dispatch({ type: 'success', user: state.user });
        } catch (error) {
            dispatch({ type: 'failure', error: error.message });
            throw error;
        }
    }, [state.user]);

    React.useEffect(() => {
        refresh().catch(() => {
            // Anonymous visitors have no session; the form stays usable.
        });
    }, [refresh]);

    return {
        user: state.user,
        loading: state.loading,
        error: state.error,
        signup,
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
