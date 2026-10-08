// Copyright (C) 2017-2026 Smart code 203358507

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatch } from 'react-router';
import { UpdateBanner } from 'stremio/components';
import { useBranding } from 'stremio/branding/BrandingContext';
import useServiceWorkerUpdater from './useServiceWorkerUpdater';
import styles from './WebUpdateScreen.less';

const STOCK_LOGO = '/brand/logo.svg';

const WebUpdateScreen = () => {
    const { t } = useTranslation();
    const { brand } = useBranding();
    const { state, dismissed, applyUpdate, dismissUpdate } = useServiceWorkerUpdater();
    const isPlayer = useMatch('/player/*');
    const autoApply = state.status === 'ready' && state.autoApply;
    const promptVisible =
        !dismissed &&
        isPlayer === null &&
        (state.status === 'ready' || state.status === 'reload-ready');
    const updateTitle = `${brand.site_name} update available`;

    useEffect(() => {
        if (autoApply && isPlayer === null) {
            applyUpdate();
        }
    }, [applyUpdate, autoApply, isPlayer]);

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

    return (
        <UpdateBanner
            className={styles['web-update-banner']}
            visible={promptVisible}
            label={updateTitle}
            actionLabel={t('RELOAD_UI')}
            closeLabel={t('BUTTON_CLOSE')}
            onAction={applyUpdate}
            onClose={dismissUpdate}
        />
    );
};

export default WebUpdateScreen;
