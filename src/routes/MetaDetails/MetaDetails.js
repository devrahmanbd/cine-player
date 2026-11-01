// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useParams, useLocation, useNavigate } = require('react-router');
const { useTranslation } = require('react-i18next');
const classnames = require('classnames');
const { useCore } = require('stremio/core');
const { useContentGamepadNavigation } = require('stremio/services/GamepadNavigation');
const { withCoreSuspender, useProfile, useLocalLibrary } = require('stremio/common');
const { useNavigateWithOrigin } = require('stremio-router');
const { HorizontalNavBar, DelayedRenderer, Image, MetaPreview } = require('stremio/components');
const StreamsList = require('./StreamsList');
const VideosList = require('./VideosList');
const { default: LiveTvDetails } = require('./LiveTvDetails');
const { default: LiveTvPlaceholder } = require('./LiveTvDetails/Placeholder');
const useMetaDetails = require('./useMetaDetails');
const useSeason = require('./useSeason');
const { default: useExternalPlayerCallback } = require('./useExternalPlayerCallback');
const styles = require('./styles');
const AdSlot = require('../../components/AdSlot/AdSlot');
const MetaRow = require('../../components/MetaRow');
const MetaItem = require('../../components/MetaItem');

const GAMEPAD_HANDLER_ID = 'metadetails';

const MetaDetails = () => {
    const { type: paramType, id, videoId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { getStoredOrigin } = useNavigateWithOrigin();
    const contentRef = React.useRef(null);
    const videosScrollMemoryRef = React.useRef(null);
    const { t } = useTranslation();
    const core = useCore();
    const profile = useProfile();
    const type = React.useMemo(() => {
        if (typeof paramType === 'string' && paramType.length > 0) return paramType;
        if (location.pathname.startsWith('/movie')) return 'movie';
        if (location.pathname.startsWith('/series')) return 'series';
        return 'movie';
    }, [paramType, location.pathname]);
    const urlParams = React.useMemo(() => ({
        type,
        id,
        videoId
    }), [type, id, videoId]);
    const metaDetails = useMetaDetails(urlParams);
    const readyMeta = metaDetails.metaItem?.content.type === 'Ready' ? metaDetails.metaItem.content.content : null;

    React.useEffect(() => {
        if (!readyMeta || typeof readyMeta.name !== 'string') return;
        const year = readyMeta.releaseInfo || (readyMeta.released ? new Date(readyMeta.released).getFullYear() : '');
        const titleStr = year ? `${readyMeta.name} (${year}) - Cinemavilla` : `${readyMeta.name} - Cinemavilla`;
        document.title = titleStr;
        let descMeta = document.querySelector('meta[name="description"]');
        if (!descMeta) {
            descMeta = document.createElement('meta');
            descMeta.setAttribute('name', 'description');
            document.head.appendChild(descMeta);
        }
        if (typeof readyMeta.description === 'string') {
            descMeta.setAttribute('content', readyMeta.description.slice(0, 250));
        }
        return () => {
            document.title = 'Cinemavilla';
        };
    }, [readyMeta]);

    const [availabilityRow, setAvailabilityRow] = React.useState(null);
    React.useEffect(() => {
        if (!type || !id) return;
        let cancelled = false;
        fetch(`/api/availability?keys=${encodeURIComponent(`${type}:${id}`)}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && data && data[`${type}:${id}`]) {
                    setAvailabilityRow(data[`${type}:${id}`]);
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [type, id]);

    const [relatedCatalog, setRelatedCatalog] = React.useState(null);
    React.useEffect(() => {
        if (!readyMeta || !type) return;
        let cancelled = false;
        const firstGenre = Array.isArray(readyMeta.genres) && readyMeta.genres[0] ? readyMeta.genres[0] : (
            Array.isArray(readyMeta.links) ? readyMeta.links.find((l) => l && l.category === 'Genres')?.name : null
        );
        const url = firstGenre
            ? `https://v3-cinemeta.strem.io/catalog/${type}/top/genre=${encodeURIComponent(firstGenre)}.json`
            : `https://v3-cinemeta.strem.io/catalog/${type}/top.json`;
        fetch(url)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!cancelled && data && Array.isArray(data.metas)) {
                    const filtered = data.metas.filter((m) => m && m.id !== id).slice(0, 10);
                    if (filtered.length > 0) {
                        setRelatedCatalog({
                            name: firstGenre ? `More ${firstGenre} Titles` : 'More Like This',
                            content: { type: 'Ready', content: filtered }
                        });
                    }
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [readyMeta, type, id]);

    const metaAddonUrl = metaDetails.metaItem?.addon.transportUrl;
    const isEpgProvider = React.useMemo(() => {
        return profile.addons.some((addon) => addon.transportUrl === metaAddonUrl && addon.manifest.behaviorHints?.epgProvider === true);
    }, [profile.addons, metaAddonUrl]);
    const isLiveMeta = isEpgProvider && readyMeta !== null && (readyMeta.behaviorHints?.isLive === true || readyMeta.type === 'tv');
    useExternalPlayerCallback(urlParams, metaDetails);
    const [season, setSeason] = useSeason(urlParams);
    const [metaPath, streamPath] = React.useMemo(() => {
        return metaDetails.selected !== null ?
            [metaDetails.selected.metaPath, metaDetails.selected.streamPath]
            :
            [null, null];
    }, [metaDetails.selected]);
    const video = React.useMemo(() => {
        return streamPath !== null && metaDetails.metaItem !== null && metaDetails.metaItem.content.type === 'Ready' ?
            metaDetails.metaItem.content.content.videos.reduce((result, video) => {
                if (video.id === streamPath.id) {
                    return video;
                }

                return result;
            }, null)
            :
            null;
    }, [metaDetails.metaItem, streamPath]);
    const externalPlayerCallbackCanMarkWatched = React.useMemo(() => {
        return typeof video?.id === 'string' &&
            metaDetails.libraryItem?.state?.video_id === video.id &&
            metaDetails.libraryItem?.state?.duration > 0;
    }, [metaDetails.libraryItem, video]);
    const localLibrary = useLocalLibrary();
    const inLocalLibrary = React.useMemo(() => {
        if (typeof type !== 'string' || typeof id !== 'string') {
            return false;
        }
        return localLibrary.items.some((item) => item.type === type && item._id === id);
    }, [localLibrary.items, type, id]);
    const addToLibrary = React.useCallback(() => {
        if (typeof type !== 'string' || typeof id !== 'string') {
            return;
        }

        localLibrary.addToLibrary(type, id).then(() => {
            window.dispatchEvent(new Event('stremio-local-library-changed'));
        }).catch(() => undefined);
    }, [localLibrary, type, id]);
    const removeFromLibrary = React.useCallback(() => {
        if (typeof type !== 'string' || typeof id !== 'string') {
            return;
        }

        localLibrary.removeFromLibrary(type, id).then(() => {
            window.dispatchEvent(new Event('stremio-local-library-changed'));
        }).catch(() => undefined);
    }, [localLibrary, type, id]);
    const toggleWatched = React.useCallback(() => {
        if (metaDetails.metaItem === null || metaDetails.metaItem.content.type !== 'Ready') {
            return;
        }

        core.transport.dispatch({
            action: 'MetaDetails',
            args: {
                action: 'MarkAsWatched',
                args: !metaDetails.metaItem.content.content.watched
            }
        });
    }, [metaDetails]);
    const toggleNotifications = React.useCallback(() => {
        if (metaDetails.libraryItem) {
            core.transport.dispatch({
                action: 'Ctx',
                args: {
                    action: 'ToggleLibraryItemNotifications',
                    args: [metaDetails.libraryItem._id, !metaDetails.libraryItem.state.noNotif],
                }
            });
        }
    }, [metaDetails.libraryItem]);
    const seasonOnSelect = React.useCallback((event) => {
        setSeason(event.value);
    }, [setSeason]);
    const handleEpisodeSearch = React.useCallback((season, episode) => {
        const searchVideoHash = encodeURIComponent(`${urlParams.id}:${season}:${episode}`);
        const url = location.pathname;
        const searchVideoPath = (urlParams.videoId === undefined || urlParams.videoId === null || urlParams.videoId === '') ?
            url + (!url.endsWith('/') ? '/' : '') + searchVideoHash
            : url.replace(encodeURIComponent(urlParams.videoId), searchVideoHash);
        navigate(searchVideoPath, { replace: true });
    }, [urlParams, location]);
    const renderBackgroundImageFallback = React.useCallback(() => null, []);
    const renderBackground = React.useMemo(() => !!(
        metaPath &&
        metaDetails?.metaItem &&
        metaDetails.metaItem.content.type !== 'Loading' &&
        typeof metaDetails.metaItem.content.content?.background === 'string' &&
        metaDetails.metaItem.content.content.background.length > 0
    ), [metaPath, metaDetails]);
    const originPath = React.useMemo(() => getStoredOrigin(), [getStoredOrigin]);
    useContentGamepadNavigation(contentRef, GAMEPAD_HANDLER_ID);
    if (type === 'tv' && (metaDetails.selected === null || (isEpgProvider && metaDetails.metaItem?.content.type === 'Loading'))) {
        return (
            <div className={styles['metadetails-container']}>
                <HorizontalNavBar
                    className={styles['nav-bar']}
                    backButton={true}
                    fullscreenButton={true}
                    navMenu={true}
                    originPath={originPath}
                />
                <LiveTvPlaceholder />
            </div>
        );
    }
    if (isLiveMeta) {
        return (
            <LiveTvDetails
                key={readyMeta.id}
                className={styles['metadetails-container']}
                contentRef={contentRef}
                meta={readyMeta}
                addonName={metaDetails.metaItem.addon.manifest.name}
                streams={metaDetails.streams}
                onToggleLibrary={inLocalLibrary ? removeFromLibrary : addToLibrary}
            >
                <HorizontalNavBar
                    className={styles['nav-bar']}
                    backButton={true}
                    fullscreenButton={true}
                    navMenu={true}
                    originPath={originPath}
                />
            </LiveTvDetails>
        );
    }
    return (
        <div className={styles['metadetails-container']}>
            {
                renderBackground ?
                    <div className={styles['background-image-layer']}>
                        <Image
                            className={styles['background-image']}
                            src={metaDetails.metaItem.content.content.background}
                            renderFallback={renderBackgroundImageFallback}
                            alt={' '}
                        />
                    </div>
                    :
                    null
            }
            <HorizontalNavBar
                className={styles['nav-bar']}
                backButton={true}
                fullscreenButton={true}
                navMenu={true}
                originPath={originPath}
            />
            <div ref={contentRef} className={styles['metadetails-content']}>
                {
                    metaPath === null ?
                        <DelayedRenderer delay={500}>
                            <div className={styles['meta-message-container']}>
                                <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                                <div className={styles['message-label']}>{t('ERR_NO_META_SELECTED')}</div>
                            </div>
                        </DelayedRenderer>
                        :
                        metaDetails.metaItem === null ?
                            <div className={styles['meta-message-container']}>
                                <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                                <div className={styles['message-label']}>{t('ERR_NO_ADDONS_FOR_META')}</div>
                            </div>
                            :
                            metaDetails.metaItem.content.type === 'Err' ?
                                <div className={styles['meta-message-container']}>
                                    <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                                    <div className={styles['message-label']}>{t('ERR_NO_META_FOUND')}</div>
                                </div>
                                :
                                metaDetails.metaItem.content.type === 'Loading' ?
                                    <MetaPreview.Placeholder className={styles['meta-preview']} />
                                    :
                                    <React.Fragment>
                                        <MetaPreview
                                            className={classnames(styles['meta-preview'], 'animation-fade-in')}
                                            name={metaDetails.metaItem.content.content.name}
                                            logo={metaDetails.metaItem.content.content.logo}
                                            runtime={metaDetails.metaItem.content.content.runtime}
                                            releaseInfo={metaDetails.metaItem.content.content.releaseInfo}
                                            released={metaDetails.metaItem.content.content.released}
                                            description={
                                                video !== null && typeof video.overview === 'string' && video.overview.length > 0 ?
                                                    video.overview
                                                    :
                                                    metaDetails.metaItem.content.content.description
                                            }
                                            links={metaDetails.metaItem.content.content.links}
                                            trailerStreams={metaDetails.metaItem.content.content.trailerStreams}
                                            inLibrary={inLocalLibrary}
                                            toggleInLibrary={inLocalLibrary ? removeFromLibrary : addToLibrary}
                                            watched={metaDetails.metaItem.content.content.watched}
                                            toggleWatched={toggleWatched}
                                            metaId={metaDetails.metaItem.content.content.id}
                                            ratingInfo={metaDetails.ratingInfo}
                                            noStream={availabilityRow?.available === 0}
                                        />
                                    </React.Fragment>
                }
                <div className={styles['spacing']} />
                <AdSlot slot={'banner_468x60'} />
                {
                    streamPath !== null ?
                        <StreamsList
                            className={styles['streams-list']}
                            streams={metaDetails.streams}
                            video={video}
                            type={streamPath.type}
                            externalPlayerCallbackCanMarkWatched={externalPlayerCallbackCanMarkWatched}
                            onEpisodeSearch={handleEpisodeSearch}
                        />
                        :
                        metaPath !== null ?
                            <VideosList
                                className={styles['videos-list']}
                                metaItem={metaDetails.metaItem}
                                libraryItem={metaDetails.libraryItem}
                                season={season}
                                selectedVideoId={metaDetails.libraryItem?.state?.video_id}
                                seasonOnSelect={seasonOnSelect}
                                toggleNotifications={toggleNotifications}
                                scrollMemoryRef={videosScrollMemoryRef}
                                titleKey={JSON.stringify([metaPath.type, metaPath.id])}
                            />
                            :
                            null
                }
                {
                    relatedCatalog !== null ?
                        <div style={{ marginTop: '2rem', padding: '0 1rem' }}>
                            <MetaRow
                                catalog={relatedCatalog}
                                title={relatedCatalog.name}
                                itemComponent={MetaItem}
                            />
                        </div>
                        :
                        null
                }
            </div>
        </div>
    );
};

const MetaDetailsFallback = () => {
    const { type } = useParams();
    return (
        <div className={styles['metadetails-container']}>
            <HorizontalNavBar
                className={styles['nav-bar']}
                backButton={true}
                fullscreenButton={true}
                navMenu={true}
            />
            {type === 'tv' && <LiveTvPlaceholder />}
        </div>
    );
};

module.exports = withCoreSuspender(MetaDetails, MetaDetailsFallback);
