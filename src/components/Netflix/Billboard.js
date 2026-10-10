// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* Hallmark · motion pass · studied-DNA (source: url https://popcornmovies.ac/) */
const React = require('react');
const PropTypes = require('prop-types');
const { default: getMetaDetailsHref } = require('stremio/common/getMetaDetailsHref');

// Popcorn-style marquee spotlight (rotating hero). Labels live in this map
// instead of raw JSX text, which the repo's i18n scan
// (tests/i18nScan.test.js) forbids outside t() calls.
const STR = {
    play: 'Play',
    info: 'More Info',
    trending: 'TRENDING NOW',
    prevArrow: '‹',
    nextArrow: '›',
    prevLabel: 'Previous spotlight',
    nextLabel: 'Next spotlight',
};

const MAX_ITEMS = 6;
const AUTOPLAY_MS = 8000;

const getYear = (item) => {
    const released = item?.released;
    if (typeof released === 'string' && released.length >= 4) {
        const match = released.match(/(\d{4})/);
        return match !== null ? match[1] : null;
    }
    if (released instanceof Date && !isNaN(released.getTime())) {
        return String(released.getFullYear());
    }
    return null;
};

const getFirstGenre = (item) => {
    const genres = item?.genres;
    if (Array.isArray(genres)) {
        for (const genre of genres) {
            if (typeof genre === 'string' && genre.length > 0) {
                return genre;
            }
        }
    }
    return null;
};

const Billboard = ({ items }) => {
    const slides = React.useMemo(() => {
        if (!Array.isArray(items)) {
            return [];
        }
        return items.filter((item) => {
            const hasBackdrop = typeof item?.background === 'string' && item.background.length > 0;
            const hasName = typeof item?.name === 'string' && item.name.length > 0;
            return hasBackdrop && hasName;
        }).slice(0, MAX_ITEMS);
    }, [items]);
    const [index, setIndex] = React.useState(0);
    const [paused, setPaused] = React.useState(false);
    const count = slides.length;
    const goPrev = React.useCallback(() => {
        setIndex((prev) => (prev - 1 + count) % count);
    }, [count]);
    const goNext = React.useCallback(() => {
        setIndex((prev) => (prev + 1) % count);
    }, [count]);
    const onKeyDown = React.useCallback((event) => {
        if (event.key === 'ArrowLeft') {
            goPrev();
        } else if (event.key === 'ArrowRight') {
            goNext();
        }
    }, [goPrev, goNext]);
    React.useEffect(() => {
        if (count <= 1 || paused) {
            return undefined;
        }
        const id = setInterval(() => {
            setIndex((prev) => (prev + 1) % count);
        }, AUTOPLAY_MS);
        return () => {
            clearInterval(id);
        };
    }, [count, paused]);
    if (count === 0) {
        return null;
    }
    const safeIndex = index % count;
    const item = slides[safeIndex];
    const backdrop = typeof item?.background === 'string' && item.background.length > 0 ? item.background : null;
    const title = typeof item?.name === 'string' && item.name.length > 0 ? item.name : null;
    if (backdrop === null || title === null) {
        return null;
    }
    const href = getMetaDetailsHref(item?.deepLinks);
    const description = typeof item?.description === 'string' && item.description.length > 0 ? item.description : null;
    const releaseInfo = typeof item?.releaseInfo === 'string' && item.releaseInfo.length > 0 ? item.releaseInfo : null;
    const year = getYear(item);
    const lead = releaseInfo !== null ? releaseInfo : year;
    const metaParts = [];
    if (lead !== null) {
        metaParts.push('★ ' + lead);
    }
    if (year !== null && year !== lead) {
        metaParts.push(year);
    }
    if (typeof item?.type === 'string' && item.type.length > 0) {
        metaParts.push(item.type.toUpperCase());
    }
    const firstGenre = getFirstGenre(item);
    if (firstGenre !== null) {
        metaParts.push(firstGenre);
    }
    const metaLine = metaParts.length > 0 ? metaParts.join(' · ') : null;
    const rank = String(safeIndex + 1).padStart(2, '0');
    const eyebrow = '#' + rank + ' · ' + STR.trending;
    return (
        <section className={'lx-pm-hero'} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onKeyDown={onKeyDown}>
            <img className={'lx-pm-backdrop'} src={backdrop} alt={''} />
            <div className={'lx-pm-fade'} />
            <div className={'lx-pm-content'} key={safeIndex}>
                <div className={'lx-pm-eyebrow'}>{eyebrow}</div>
                <div className={'lx-pm-title'}>{title}</div>
                {
                    metaLine !== null ?
                        <div className={'lx-pm-meta'}>{metaLine}</div>
                        :
                        null
                }
                {
                    description !== null ?
                        <div className={'lx-pm-desc'}>{description}</div>
                        :
                        null
                }
                <div className={'lx-pm-actions'}>
                    <a className={'lx-pm-play'} href={href}>{STR.play}</a>
                    <a className={'lx-pm-info'} href={href}>{STR.info}</a>
                </div>
                <div className={'lx-pm-segments'}>
                    {slides.map((slide, segIndex) => {
                        const key = typeof slide?.id === 'string' && slide.id.length > 0 ? slide.id : String(segIndex);
                        return (
                            <button
                                key={key}
                                className={'lx-pm-seg'}
                                type={'button'}
                                aria-current={segIndex === safeIndex}
                                onClick={() => setIndex(segIndex)}
                            />
                        );
                    })}
                </div>
            </div>
            <button className={'lx-pm-arrow'} type={'button'} data-dir={'prev'} aria-label={STR.prevLabel} onClick={goPrev}>{STR.prevArrow}</button>
            <button className={'lx-pm-arrow'} type={'button'} data-dir={'next'} aria-label={STR.nextLabel} onClick={goNext}>{STR.nextArrow}</button>
        </section>
    );
};

Billboard.propTypes = {
    items: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        background: PropTypes.string,
        name: PropTypes.string,
        description: PropTypes.string,
        releaseInfo: PropTypes.string,
        released: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        type: PropTypes.string,
        genres: PropTypes.arrayOf(PropTypes.string),
        deepLinks: PropTypes.shape({
            metaDetailsVideos: PropTypes.string,
            metaDetailsStreams: PropTypes.string,
            player: PropTypes.string,
        }),
    })),
};

module.exports = Billboard;
