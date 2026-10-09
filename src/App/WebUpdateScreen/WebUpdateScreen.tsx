// Copyright (C) 2017-2026 Smart code 203358507

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatch } from 'react-router';
import { useBranding } from 'stremio/branding/BrandingContext';
import { isAdminRoute } from 'stremio/branding/adInjector';
import useServiceWorkerUpdater from './useServiceWorkerUpdater';
import styles from './WebUpdateScreen.less';

const STOCK_LOGO = '/brand/logo.svg';

const WebUpdateScreen = () => {
    const { t } = useTranslation();
    const { brand } = useBranding();
    const { state, applyUpdate } = useServiceWorkerUpdater();
    const isPlayer = useMatch('/player/*');

    // Silent auto-updates everywhere except playback and admin work:
    // never interrupt a video or wipe an admin form mid-edit.
    useEffect(() => {
        if (state.status === 'ready' && isPlayer === null && !isAdminRoute()) {
            applyUpdate();
        }
    }, [applyUpdate, state.status, isPlayer]);

    if (state.status === 'applying') {
        return (
            <div
                className={styles['web-update-screen']}
                role={'status'}
                aria-live={'polite'}
                aria-busy={true}
            >
                <img
                    className={styles['logo']}
                    src={brand.logo_url && brand.logo_url.length > 0 ? brand.logo_url : STOCK_LOGO}
                    alt={''}
                />
                <div className={styles['title']}>
                    {t('UPDATER_TITLE')}
                </div>
                <div className={styles['progress']} aria-hidden={true}>
                    <div className={styles['progress-value']} />
                </div>
            </div>
        );
    }

    // No update nag banner: updates auto-apply silently in the background.
    return null;
};

export default WebUpdateScreen;
