// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Optional newsletter signup popup: collects emails so users can be told the
// new domain URL when this one moves. Never blocks the app; dismiss is final
// per browser (localStorage).
const React = require('react');
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

const NewsletterPopup = () => {
    const [dismissed, setDismissed] = React.useState(readDismissed);
    const [email, setEmail] = React.useState('');
    const [phase, setPhase] = React.useState('form');

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

    if (dismissed) {
        return null;
    }

    return (
        <div className={styles['newsletter-overlay']} role="dialog" aria-label="Domain updates">
            <div className={styles['newsletter-card']}>
                <button className={styles['newsletter-close']} onClick={dismiss} aria-label="Close">×</button>
                {
                    phase === 'done' ?
                        <div className={styles['newsletter-done']}>
                            <div className={styles['newsletter-title']}>You’re on the list</div>
                            <p className={styles['newsletter-text']}>
                                If this domain ever moves, you’ll get the new URL by email.
                            </p>
                        </div>
                        :
                        <form onSubmit={onSubmit}>
                            <div className={styles['newsletter-title']}>Domain updates</div>
                            <p className={styles['newsletter-text']}>
                                This site may change domains from time to time. Leave your email and we’ll
                                send you the backup URL if it ever moves. No spam.
                            </p>
                            <input
                                className={styles['newsletter-input']}
                                type="email"
                                required
                                placeholder="you@email.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                autoFocus
                            />
                            {
                                phase === 'error' ?
                                    <div className={styles['newsletter-error']}>Couldn’t save — try again.</div>
                                    : null
                            }
                            <div className={styles['newsletter-actions']}>
                                <button type="submit" className={styles['newsletter-submit']}>
                                    {phase === 'sending' ? 'Saving…' : 'Notify me'}
                                </button>
                                <button type="button" className={styles['newsletter-no']} onClick={dismiss}>
                                    No thanks
                                </button>
                            </div>
                        </form>
                }
            </div>
        </div>
    );
};

module.exports = NewsletterPopup;
