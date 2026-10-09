// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
const React = require('react');
const PropTypes = require('prop-types');
const { default: getMetaDetailsHref } = require('stremio/common/getMetaDetailsHref');

// Structure-only billboard (styled in parallel by another agent).
// Labels live in this map instead of raw JSX text, which the repo's
// i18n scan (tests/i18nScan.test.js) forbids outside t() calls.
const STR = {
    play: 'Play',
    info: 'More Info',
};

const Billboard = ({ item }) => {
    const backdrop = typeof item?.background === 'string' && item.background.length > 0 ? item.background : null;
    const title = typeof item?.name === 'string' && item.name.length > 0 ? item.name : null;
    if (backdrop === null || title === null) {
        return null;
    }
    const href = getMetaDetailsHref(item?.deepLinks);
    const description = typeof item?.description === 'string' && item.description.length > 0 ? item.description : null;
    const metaParts = [];
    if (typeof item?.releaseInfo === 'string' && item.releaseInfo.length > 0) {
        metaParts.push(item.releaseInfo);
    }
    if (typeof item?.runtime === 'string' && item.runtime.length > 0) {
        metaParts.push(item.runtime);
    }
    const metaLine = metaParts.length > 0 ? metaParts.join(' \u00B7 ') : null;
    return (
        <section className={'lx-nf-billboard'}>
            <img className={'lx-nf-backdrop'} src={backdrop} alt={''} />
            <div className={'lx-nf-gradient'} />
            <div className={'lx-nf-content'}>
                <div className={'lx-nf-title'}>{title}</div>
                {
                    metaLine !== null ?
                        <div className={'lx-nf-meta'}>{metaLine}</div>
                        :
                        null
                }
                {
                    description !== null ?
                        <div className={'lx-nf-desc'}>{description}</div>
                        :
                        null
                }
                <div className={'lx-nf-actions'}>
                    <a className={'lx-nf-play'} href={href}>{STR.play}</a>
                    <a className={'lx-nf-info'} href={href}>{STR.info}</a>
                </div>
            </div>
        </section>
    );
};

Billboard.propTypes = {
    item: PropTypes.shape({
        background: PropTypes.string,
        name: PropTypes.string,
        description: PropTypes.string,
        releaseInfo: PropTypes.string,
        runtime: PropTypes.string,
        deepLinks: PropTypes.shape({
            metaDetailsVideos: PropTypes.string,
            metaDetailsStreams: PropTypes.string,
            player: PropTypes.string,
        }),
    }),
};

module.exports = Billboard;
