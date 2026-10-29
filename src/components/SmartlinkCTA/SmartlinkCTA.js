// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Blocker-proof smartlink CTA: a first-party anchor to the Adsterra
// direct-link offer instead of a third-party script, so domain blocklists
// and content blockers cannot strip it. Renders nothing while the smartlink
// slot is off/absent (and always while the master ads switch is off, since
// BrandingContext then exposes ads = {}).
const React = require('react');
const { useTranslation } = require('react-i18next');
const { useBranding } = require('../../branding/BrandingContext');
const { getSmartlink } = require('../../branding/adInjector');
const styles = require('./styles.less');

const SmartlinkCTA = () => {
    const { ads } = useBranding();
    const { t } = useTranslation();
    const url = getSmartlink(ads);
    if (!url) return null;
    return (
        <a className={styles['smartlink-cta']} href={url} target={'_blank'} rel={'sponsored noopener noreferrer'}>
            {t('SMARTLINK_CTA')}
        </a>
    );
};

module.exports = SmartlinkCTA;
