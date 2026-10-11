// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useNavigate } = require('react-router');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('stremio/components/BrandIcons');
const { Button } = require('stremio/components');
const useLocalAuth = require('stremio/common/useLocalAuth');
const useProfile = require('stremio/common/useProfile');
const { withCoreSuspender } = require('stremio/common/CoreSuspender');
const useStreamingServer = require('stremio/common/useStreamingServer');
const styles = require('./styles');

const NavMenuContent = ({ onClick }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const profile = useProfile();
    const { user: localUser, logout } = useLocalAuth();
    const streamingServer = useStreamingServer();
    const streamingServerWarningDismissed = React.useMemo(() => {
        return streamingServer.settings !== null && streamingServer.settings.type === 'Ready' || (
            !isNaN(profile.settings.streamingServerWarningDismissed.getTime()) &&
            profile.settings.streamingServerWarningDismissed.getTime() > Date.now()
        );
    }, [profile.settings, streamingServer.settings]);
    const logoutButtonOnClick = React.useCallback(() => {
        logout().then(() => {
            navigate('/intro');
        }).catch(() => {
            // No surface for logout errors here; the session simply stays.
        });
    }, [logout, navigate]);
    const handleAuth = React.useCallback(() => {
        return localUser !== null
            ? logoutButtonOnClick()
            : navigate('/intro');
    }, [localUser, logoutButtonOnClick, navigate]);

    return (
        <div className={classnames(styles['nav-menu-container'], 'animation-fade-in', { [styles['with-warning']]: !streamingServerWarningDismissed } )} onClick={onClick}>
            <div className={styles['user-info-container']}>
                <div
                    className={styles['avatar-container']}
                    style={{
                        backgroundImage: localUser === null ?
                            `url('${require('/assets/images/anonymous.png')}')`
                            :
                            `url('${require('/assets/images/default_avatar.png')}')`
                    }}
                />
                <div className={styles['user-info-details']}>
                    <div className={styles['email-container']}>
                        <div className={styles['email-label']}>{localUser === null ? t('ANONYMOUS_USER') : localUser.email}</div>
                    </div>
                    <Button className={styles['logout-button-container']} title={localUser === null ? `${t('LOG_IN')} / ${t('SIGN_UP')}` : t('LOG_OUT')} onClick={handleAuth}>
                        <div className={styles['logout-label']}>{localUser === null ? `${t('LOG_IN')} / ${t('SIGN_UP')}` : t('LOG_OUT')}</div>
                    </Button>
                </div>
            </div>
            <div className={styles['nav-menu-section']}>
                <Button className={styles['nav-menu-option-container']} title={ t('SETTINGS') } href={'#/settings'}>
                    <Icon className={styles['icon']} name={'settings'} />
                    <div className={styles['nav-menu-option-label']}>{ t('SETTINGS') }</div>
                </Button>
            </div>
        </div>
    );
};

NavMenuContent.propTypes = {
    onClick: PropTypes.func
};

const NavMenuContentFallback = () => (
    <div className={styles['nav-menu-container']} />
);

module.exports = withCoreSuspender(NavMenuContent, NavMenuContentFallback);
