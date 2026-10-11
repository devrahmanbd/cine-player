// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useTranslation } = require('react-i18next');
const { useSearchParams, useNavigate } = require('react-router-dom');
const classnames = require('classnames');
const Modal = require('stremio/router/Modal');
const { useBinaryState, useLocalAuth } = require('stremio/common');
const { default: useRouteFocused } = require('stremio/common/useRouteFocused');
const { Button, Image, Checkbox } = require('stremio/components');
const CredentialsTextInput = require('./CredentialsTextInput');
const { useBranding } = require('stremio/branding/BrandingContext');

const styles = require('./styles');

const SIGNUP_FORM = 'signup';
const LOGIN_FORM = 'login';
const OTP_REQUEST_VIEW = 'request';
const OTP_CONFIRM_VIEW = 'confirm';

const STOCK_LOGO = '/brand/logo.svg';

const Intro = () => {
    const [queryParams, setQueryParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { brand } = useBranding();
    const logoSrc = typeof brand.logo_url === 'string' && brand.logo_url.length > 0 ? brand.logo_url : STOCK_LOGO;
    const routeFocused = useRouteFocused();
    const {
        user: localUser,
        loading: authLoading,
        signup: authSignup,
        verifySignup: authVerifySignup,
        resendCode: authResendCode,
        login: authLogin,
        requestOtp: authRequestOtp,
        confirmOtp: authConfirmOtp
    } = useLocalAuth();
    const emailRef = React.useRef(null);
    const passwordRef = React.useRef(null);
    const confirmPasswordRef = React.useRef(null);
    const otpCodeRef = React.useRef(null);
    const otpPasswordRef = React.useRef(null);
    const otpConfirmPasswordRef = React.useRef(null);
    const termsRef = React.useRef(null);
    const privacyPolicyRef = React.useRef(null);
    const marketingRef = React.useRef(null);
    const errorRef = React.useRef(null);
    const [loaderModalOpen, openLoaderModal, closeLoaderModal] = useBinaryState(false);
    const [state, dispatch] = React.useReducer(
        (state, action) => {
            switch (action.type) {
                case 'set-form':
                    if (state.form !== action.form) {
                        return {
                            form: action.form,
                            email: '',
                            password: '',
                            confirmPassword: '',
                            termsAccepted: false,
                            privacyPolicyAccepted: false,
                            marketingAccepted: false,
                            otp: null,
                            otpMode: 'reset',
                            code: '',
                            newPassword: '',
                            confirmNewPassword: '',
                            error: ''
                        };
                    }
                    return state;
                case 'show-otp':
                    return {
                        ...state,
                        otp: action.otp,
                        otpMode: action.mode || state.otpMode,
                        error: ''
                    };
                case 'change-credentials':
                    return {
                        ...state,
                        error: '',
                        [action.name]: action.value
                    };
                case 'toggle-checkbox':
                    return {
                        ...state,
                        error: '',
                        [action.name]: !state[action.name]
                    };
                case 'error':
                    return {
                        ...state,
                        error: action.error
                    };
                default:
                    return state;
            }
        },
        {
            form: [LOGIN_FORM, SIGNUP_FORM].includes(queryParams.get('form')) ? queryParams.get('form') : SIGNUP_FORM,
            email: '',
            password: '',
            confirmPassword: '',
            termsAccepted: false,
            privacyPolicyAccepted: false,
            marketingAccepted: false,
            otp: null,
            otpMode: 'reset',
            code: '',
            newPassword: '',
            confirmNewPassword: '',
            error: ''
        }
    );
    const loginWithEmail = React.useCallback(() => {
        if (typeof state.email !== 'string' || state.email.length === 0 || !emailRef.current.validity.valid) {
            dispatch({ type: 'error', error: t('INVALID_EMAIL') });
            return;
        }
        if (typeof state.password !== 'string' || state.password.length === 0) {
            dispatch({ type: 'error', error: t('INVALID_PASSWORD') });
            return;
        }
        authLogin(state.email, state.password).catch((error) => {
            dispatch({ type: 'error', error: error.message });
        });
    }, [state.email, state.password, authLogin, t]);
    const signup = React.useCallback(() => {
        if (typeof state.email !== 'string' || state.email.length === 0 || !emailRef.current.validity.valid) {
            dispatch({ type: 'error', error: t('INVALID_EMAIL') });
            return;
        }
        if (typeof state.password !== 'string' || state.password.length === 0) {
            dispatch({ type: 'error', error: t('INVALID_PASSWORD') });
            return;
        }
        if (state.password !== state.confirmPassword) {
            dispatch({ type: 'error', error: t('PASSWORDS_NOMATCH') });
            return;
        }
        if (!state.termsAccepted) {
            dispatch({ type: 'error', error: t('MUST_ACCEPT_TERMS') });
            return;
        }
        if (!state.privacyPolicyAccepted) {
            dispatch({ type: 'error', error: t('MUST_ACCEPT_PRIVACY_POLICY') });
            return;
        }
        authSignup(state.email, state.password).then(() => {
            dispatch({ type: 'show-otp', otp: OTP_CONFIRM_VIEW, mode: 'signup' });
        }).catch((error) => {
            dispatch({ type: 'error', error: error.message });
        });
    }, [state.email, state.password, state.confirmPassword, state.termsAccepted, state.privacyPolicyAccepted, authSignup, t]);
    const openForgotPassword = React.useCallback(() => {
        dispatch({ type: 'show-otp', otp: OTP_REQUEST_VIEW, mode: 'reset' });
    }, []);
    const backFromOtp = React.useCallback(() => {
        if (state.otpMode === 'signup') {
            dispatch({ type: 'show-otp', otp: null, mode: 'reset' });
            return;
        }
        dispatch({ type: 'show-otp', otp: state.otp === OTP_CONFIRM_VIEW ? OTP_REQUEST_VIEW : null });
    }, [state.otp, state.otpMode]);
    const submitOtpRequest = React.useCallback(() => {
        if (typeof state.email !== 'string' || state.email.length === 0 || !emailRef.current.validity.valid) {
            dispatch({ type: 'error', error: t('INVALID_EMAIL') });
            return;
        }
        authRequestOtp(state.email).then(() => {
            dispatch({ type: 'show-otp', otp: OTP_CONFIRM_VIEW });
        }).catch((error) => {
            dispatch({ type: 'error', error: error.message });
        });
    }, [state.email, authRequestOtp, t]);
    const submitOtpConfirm = React.useCallback(() => {
        if (state.otpMode === 'signup') {
            if (typeof state.code !== 'string' || state.code.trim().length === 0) {
                dispatch({ type: 'error', error: t('INVALID_CODE') });
                return;
            }
            authVerifySignup(state.email, state.code).catch((error) => {
                dispatch({ type: 'error', error: error.message });
            });
            return;
        }
        if (typeof state.newPassword !== 'string' || state.newPassword.length === 0) {
            dispatch({ type: 'error', error: t('INVALID_PASSWORD') });
            return;
        }
        if (state.newPassword !== state.confirmNewPassword) {
            dispatch({ type: 'error', error: t('PASSWORDS_NOMATCH') });
            return;
        }
        authConfirmOtp(state.email, state.code, state.newPassword).then(() => {
            dispatch({ type: 'show-otp', otp: null });
        }).catch((error) => {
            dispatch({ type: 'error', error: error.message });
        });
    }, [state.otpMode, state.email, state.code, state.newPassword, state.confirmNewPassword, authVerifySignup, authConfirmOtp, t]);
    const resendSignupCode = React.useCallback(() => {
        authResendCode(state.email).catch((error) => {
            dispatch({ type: 'error', error: error.message });
        });
    }, [state.email, authResendCode]);
    const emailOnChange = React.useCallback((event) => {
        dispatch({
            type: 'change-credentials',
            name: 'email',
            value: event.currentTarget.value
        });
    }, []);
    const emailOnSubmit = React.useCallback(() => {
        passwordRef.current.focus();
    }, []);
    const otpEmailOnSubmit = React.useCallback(() => {
        submitOtpRequest();
    }, [submitOtpRequest]);
    const passwordOnChange = React.useCallback((event) => {
        dispatch({
            type: 'change-credentials',
            name: 'password',
            value: event.currentTarget.value
        });
    }, []);
    const passwordOnSubmit = React.useCallback(() => {
        if (state.form === SIGNUP_FORM) {
            confirmPasswordRef.current.focus();
        } else {
            loginWithEmail();
        }
    }, [state.form, loginWithEmail]);
    const confirmPasswordOnChange = React.useCallback((event) => {
        dispatch({
            type: 'change-credentials',
            name: 'confirmPassword',
            value: event.currentTarget.value
        });
    }, []);
    const confirmPasswordOnSubmit = React.useCallback(() => {
        termsRef.current.focus();
    }, []);
    const codeOnChange = React.useCallback((event) => {
        dispatch({
            type: 'change-credentials',
            name: 'code',
            value: event.currentTarget.value
        });
    }, []);
    const codeOnSubmit = React.useCallback(() => {
        otpPasswordRef.current.focus();
    }, []);
    const newPasswordOnChange = React.useCallback((event) => {
        dispatch({
            type: 'change-credentials',
            name: 'newPassword',
            value: event.currentTarget.value
        });
    }, []);
    const newPasswordOnSubmit = React.useCallback(() => {
        otpConfirmPasswordRef.current.focus();
    }, []);
    const confirmNewPasswordOnChange = React.useCallback((event) => {
        dispatch({
            type: 'change-credentials',
            name: 'confirmNewPassword',
            value: event.currentTarget.value
        });
    }, []);
    const confirmNewPasswordOnSubmit = React.useCallback(() => {
        submitOtpConfirm();
    }, [submitOtpConfirm]);
    const toggleTermsAccepted = React.useCallback(() => {
        dispatch({ type: 'toggle-checkbox', name: 'termsAccepted' });
    }, []);
    const togglePrivacyPolicyAccepted = React.useCallback(() => {
        dispatch({ type: 'toggle-checkbox', name: 'privacyPolicyAccepted' });
    }, []);
    const toggleMarketingAccepted = React.useCallback(() => {
        dispatch({ type: 'toggle-checkbox', name: 'marketingAccepted' });
    }, []);
    const switchFormOnClick = React.useCallback(() => {
        const queryParams = new URLSearchParams([['form', state.form === SIGNUP_FORM ? LOGIN_FORM : SIGNUP_FORM]]);
        setQueryParams(queryParams);
    }, [state.form, setQueryParams]);
    React.useEffect(() => {
        if ([LOGIN_FORM, SIGNUP_FORM].includes(queryParams.get('form'))) {
            dispatch({ type: 'set-form', form: queryParams.get('form') });
        }
    }, [queryParams]);
    React.useEffect(() => {
        if (routeFocused && typeof state.error === 'string' && state.error.length > 0) {
            errorRef.current.scrollIntoView();
        }
    }, [state.error]);
    React.useEffect(() => {
        if (routeFocused) {
            if (state.otp === OTP_CONFIRM_VIEW && otpCodeRef.current !== null) {
                otpCodeRef.current.focus();
            } else if (emailRef.current !== null) {
                emailRef.current.focus();
            }
        }
    }, [state.form, state.otp, routeFocused]);
    React.useEffect(() => {
        if (authLoading) {
            openLoaderModal();
        } else {
            closeLoaderModal();
        }
    }, [authLoading, openLoaderModal, closeLoaderModal]);
    React.useEffect(() => {
        if (localUser !== null && routeFocused) {
            navigate('/');
        }
    }, [localUser, routeFocused, navigate]);
    return (
        <div className={styles['intro-container']}>
            <div className={styles['background-container']} />
            <div className={styles['heading-container']}>
                <div className={styles['logo-container']}>
                    <Image className={styles['logo']} src={logoSrc} fallbackSrc={STOCK_LOGO} alt={' '} />
                </div>
                <div className={styles['title-container']}>
                    {t('WEBSITE_SLOGAN_NEW_NEW')}
                </div>
                <div className={styles['slogan-container']}>
                    {t('WEBSITE_SLOGAN_ALL')}
                </div>
            </div>
            <div className={styles['content-container']}>
                <div className={styles['form-container']}>
                    {
                        state.otp === OTP_REQUEST_VIEW ?
                            <React.Fragment>
                                <div className={styles['otp-title']}>{t('PASSWORD_RESET')}</div>
                                <CredentialsTextInput
                                    ref={emailRef}
                                    className={styles['credentials-text-input']}
                                    type={'email'}
                                    placeholder={t('EMAIL')}
                                    value={state.email}
                                    onChange={emailOnChange}
                                    onSubmit={otpEmailOnSubmit}
                                />
                                {
                                    state.error && state.error.length > 0 ?
                                        <div ref={errorRef} className={styles['error-message']}>{state.error}</div>
                                        :
                                        null
                                }
                                <Button className={classnames(styles['form-button'], styles['submit-button'])} onClick={submitOtpRequest}>
                                    <div className={styles['label']}>{t('BUTTON_SEND')}</div>
                                </Button>
                                <Button className={classnames(styles['form-button'], styles['login-form-button'])} onClick={backFromOtp}>
                                    <div className={styles['label']}>{t('BACK')}</div>
                                </Button>
                            </React.Fragment>
                            :
                            state.otp === OTP_CONFIRM_VIEW ?
                                <React.Fragment>
                                    <div className={styles['otp-title']}>{state.otpMode === 'signup' ? t('VERIFY_EMAIL_TITLE') : t('PASSWORD_RESET')}</div>
                                    <div className={styles['otp-message']}>{state.otpMode === 'signup' ? t('VERIFY_EMAIL_MESSAGE') : t('WEBSITE_RESET_PASSWORD_MESSAGE')}</div>
                                    <CredentialsTextInput
                                        ref={otpCodeRef}
                                        className={styles['credentials-text-input']}
                                        type={'text'}
                                        autoComplete={'one-time-code'}
                                        inputMode={'numeric'}
                                        aria-label={state.otpMode === 'signup' ? t('VERIFY_EMAIL_TITLE') : t('PASSWORD_RESET')}
                                        value={state.code}
                                        onChange={codeOnChange}
                                        onSubmit={codeOnSubmit}
                                    />
                                    {
                                        state.otpMode === 'signup' ?
                                            null
                                            :
                                            <React.Fragment>
                                                <CredentialsTextInput
                                                    ref={otpPasswordRef}
                                                    className={styles['credentials-text-input']}
                                                    type={'password'}
                                                    placeholder={t('WEBSITE_NEW_PASSWORD')}
                                                    value={state.newPassword}
                                                    onChange={newPasswordOnChange}
                                                    onSubmit={newPasswordOnSubmit}
                                                />
                                                <CredentialsTextInput
                                                    ref={otpConfirmPasswordRef}
                                                    className={styles['credentials-text-input']}
                                                    type={'password'}
                                                    placeholder={t('WEBSITE_REPEAT_NEW_PASSWORD')}
                                                    value={state.confirmNewPassword}
                                                    onChange={confirmNewPasswordOnChange}
                                                    onSubmit={confirmNewPasswordOnSubmit}
                                                />
                                            </React.Fragment>
                                    }
                                    {
                                        state.error && state.error.length > 0 ?
                                            <div ref={errorRef} className={styles['error-message']}>{state.error}</div>
                                            :
                                            null
                                    }
                                    <Button className={classnames(styles['form-button'], styles['submit-button'])} onClick={submitOtpConfirm}>
                                        <div className={styles['label']}>{t('BUTTON_CONFIRM')}</div>
                                    </Button>
                                    {
                                        state.otpMode === 'signup' ?
                                            <Button className={classnames(styles['form-button'], styles['login-form-button'])} onClick={resendSignupCode}>
                                                <div className={styles['label']}>{t('VERIFY_RESEND')}</div>
                                            </Button>
                                            :
                                            null
                                    }
                                    <Button className={classnames(styles['form-button'], styles['login-form-button'])} onClick={backFromOtp}>
                                        <div className={styles['label']}>{t('BACK')}</div>
                                    </Button>
                                </React.Fragment>
                                :
                                <React.Fragment>
                                    <CredentialsTextInput
                                        ref={emailRef}
                                        className={styles['credentials-text-input']}
                                        type={'email'}
                                        placeholder={t('EMAIL')}
                                        value={state.email}
                                        onChange={emailOnChange}
                                        onSubmit={emailOnSubmit}
                                    />
                                    <CredentialsTextInput
                                        ref={passwordRef}
                                        className={styles['credentials-text-input']}
                                        type={'password'}
                                        placeholder={t('PASSWORD')}
                                        value={state.password}
                                        onChange={passwordOnChange}
                                        onSubmit={passwordOnSubmit}
                                    />
                                    {
                                        state.form === SIGNUP_FORM ?
                                            <React.Fragment>
                                                <CredentialsTextInput
                                                    ref={confirmPasswordRef}
                                                    className={styles['credentials-text-input']}
                                                    type={'password'}
                                                    placeholder={t('PASSWORD_CONFIRM')}
                                                    value={state.confirmPassword}
                                                    onChange={confirmPasswordOnChange}
                                                    onSubmit={confirmPasswordOnSubmit}
                                                />
                                                <Checkbox
                                                    ref={termsRef}
                                                    label={t('READ_AND_AGREE')}
                                                    checked={state.termsAccepted}
                                                    onChange={toggleTermsAccepted}
                                                />
                                                <Checkbox
                                                    ref={privacyPolicyRef}
                                                    label={t('READ_AND_AGREE')}
                                                    checked={state.privacyPolicyAccepted}
                                                    onChange={togglePrivacyPolicyAccepted}
                                                />
                                                <Checkbox
                                                    ref={marketingRef}
                                                    label={t('MARKETING_AGREE')}
                                                    checked={state.marketingAccepted}
                                                    onChange={toggleMarketingAccepted}
                                                />
                                            </React.Fragment>
                                            :
                                            <div className={styles['forgot-password-link-container']}>
                                                <Button className={styles['forgot-password-link']} onClick={openForgotPassword}>{t('FORGOT_PASSWORD')}</Button>
                                            </div>
                                    }
                                    {
                                        state.error && state.error.length > 0 ?
                                            <div ref={errorRef} className={styles['error-message']}>{state.error}</div>
                                            :
                                            null
                                    }
                                    <Button className={classnames(styles['form-button'], styles['submit-button'])} onClick={state.form === SIGNUP_FORM ? signup : loginWithEmail}>
                                        <div className={styles['label']}>{state.form === SIGNUP_FORM ? t('SIGN_UP') : t('LOG_IN')}</div>
                                    </Button>
                                </React.Fragment>
                    }
                </div>
                {
                    state.otp === null ?
                        <div className={styles['options-container']}>
                            {
                                state.form === SIGNUP_FORM ?
                                    <Button className={classnames(styles['form-button'], styles['login-form-button'])} onClick={switchFormOnClick}>
                                        <div className={styles['label']}>{t('LOG_IN')}</div>
                                    </Button>
                                    :
                                    null
                            }
                            {
                                state.form === LOGIN_FORM ?
                                    <Button className={classnames(styles['form-button'], styles['signup-form-button'])} onClick={switchFormOnClick}>
                                        <div className={styles['label']}>{t('SIGN_UP_EMAIL')}</div>
                                    </Button>
                                    :
                                    null
                            }
                        </div>
                        :
                        null
                }
            </div>
            {
                loaderModalOpen ?
                    <Modal className={styles['loading-modal-container']}>
                        <div className={styles['loader-container']}>
                            <div className={styles['spinner']} />
                            <div className={styles['label']}>{t('AUTHENTICATING')}</div>
                        </div>
                    </Modal>
                    :
                    null
            }
        </div>
    );
};

module.exports = Intro;
