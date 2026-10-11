import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import useLocalAuth from 'stremio/common/useLocalAuth';
import { Link } from '../../components';
import styles from './User.less';

const User = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: localUser, logout } = useLocalAuth();

    const avatar = useMemo(() => (
        !localUser ?
            `url('${require('/assets/images/anonymous.png')}')`
            :
            `url('${require('/assets/images/default_avatar.png')}')`
    ), [localUser]);

    const onLogout = useCallback(() => {
        logout().then(() => {
            navigate('/intro');
        }).catch(() => {
            // No surface for logout errors here; the session simply stays.
        });
    }, [logout, navigate]);

    return (
        <div className={styles['user']}>
            <div className={styles['user-info-content']}>
                <div
                    className={styles['avatar-container']}
                    style={{ backgroundImage: avatar }}
                />
                <div className={styles['email-logout-container']}>
                    <div className={styles['email-label-container']} title={localUser === null ? t('ANONYMOUS_USER') : localUser.email}>
                        <div className={styles['email-label']}>
                            {localUser === null ? t('ANONYMOUS_USER') : localUser.email}
                        </div>
                    </div>
                    {
                        localUser !== null ?
                            <Link
                                label={t('LOG_OUT')}
                                onClick={onLogout}
                            />
                            :
                            <Link
                                label={`${t('LOG_IN')} / ${t('SIGN_UP')}`}
                                href={'#/intro'}
                                target={'_self'}
                            />
                    }
                </div>
            </div>
        </div>
    );
};

export default User;
