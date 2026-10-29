// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Optional newsletter signup popup: collects emails so users can be told the
// new domain URL when this one moves. Never blocks the app; dismiss is final
// per browser (localStorage).
//
// Rendering notes: the popup wraps itself in react-focus-lock (the same lock
// the app's modals use) so keyboard/remote navigation stays trapped inside it
// while it's up, and it stays hidden while any other modal is open — a modal's
// lock mounting after this popup would otherwise steal focus from the email
// input on every click (see popupState.js).
const React = require('react');
const { useTranslation } = require('react-i18next');
const FocusLock = require('react-focus-lock').default;
const { canShowPopup } = require('./popupState');
const styles = require('./styles');

const STORAGE_KEY = 'newsletter-popup-dismissed';

function readDismissed() {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_) {
        return true;
    }
}

function writeDismissed() {
    try {
        window.localStorage.setItem(STORAGE_KEY, '1');
    } catch (_) {
        // Private mode etc. — dismiss for this session only.
    }
}

const countOpenModals = () =>
    typeof document === 'undefined' ? 0 : document.querySelectorAll('.modals-container > *').length;

const NewsletterPopup = () => {
    const { t } = useTranslation();
    const [dismissed, setDismissed] = React.useState(readDismissed);
    const [openModals, setOpenModals] = React.useState(countOpenModals);
    const [email, setEmail] = React.useState('');
    const [phase, setPhase] = React.useState('form');

    React.useEffect(() => {
        if (dismissed) {
            return undefined;
        }
        const update = () => setOpenModals(countOpenModals());
        update();
        const id = window.setInterval(update, 500);
        return () => window.clearInterval(id);
    }, [dismissed]);

    const dismiss = React.useCallback(() => {
        writeDismissed();
        setDismissed(true);
    }, []);

    const onSubmit = React.useCallback((event) => {
        event.preventDefault();
        const value = email.trim();
        if (value.length === 0 || phase === 'sending') {
            return;
        }
        setPhase('sending');
        fetch('/api/newsletter', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: value, source: 'popup' })
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('newsletter failed');
                }
                writeDismissed();
                setPhase('done');
            })
            .catch(() => setPhase('error'));
    }, [email, phase]);

    React.useEffect(() => {
        if (!canShowPopup({ dismissed, openModals })) {
            return undefined;
        }
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                dismiss();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [dismissed, openModals, dismiss]);

    if (!canShowPopup({ dismissed, openModals })) {
        return null;
    }

    return (
        <FocusLock
            className={styles['newsletter-overlay']}
            autoFocus
            lockProps={{
                role: 'dialog',
                'aria-modal': true,
                'aria-label': 'Domain updates'
            }}
        >
            <div className={styles['newsletter-card']}>
                <button className={styles['newsletter-close']} onClick={dismiss} aria-label="Close">×</button>
                {
                    phase === 'done' ?
                        <div className={styles['newsletter-done']}>
                            <div className={styles['newsletter-title']}>{t('NEWSLETTER_DONE_TITLE')}</div>
                            <p className={styles['newsletter-text']}>
                                {t('NEWSLETTER_DONE_BODY')}
                            </p>
                        </div>
                        :
                        <form onSubmit={onSubmit}>
                            <div className={styles['newsletter-title']}>{t('NEWSLETTER_TITLE')}</div>
                            <p className={styles['newsletter-text']}>
                                {t('NEWSLETTER_BODY')}
                            </p>
                            <input
                                className={styles['newsletter-input']}
                                type="email"
                                required
                                placeholder={t('NEWSLETTER_PLACEHOLDER')}
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                data-autofocus
                            />
                            {
                                phase === 'error' ?
                                    <div className={styles['newsletter-error']}>{t('NEWSLETTER_ERROR')}</div>
                                    : null
                            }
                            <div className={styles['newsletter-actions']}>
                                <button type="submit" className={styles['newsletter-submit']}>
                                    {phase === 'sending' ? t('NEWSLETTER_SENDING') : t('NEWSLETTER_SUBMIT')}
                                </button>
                                <button type="button" className={styles['newsletter-no']} onClick={dismiss}>
                                    {t('NEWSLETTER_NO')}
                                </button>
                            </div>
                        </form>
                }
            </div>
        </FocusLock>
    );
};

module.exports = NewsletterPopup;
