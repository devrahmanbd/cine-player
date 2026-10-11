// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useNavigate } = require('react-router');
const { useNavigateWithOrigin } = require('stremio-router');
const { default: toPath } = require('stremio-router/toPath');
const PropTypes = require('prop-types');
const { default: getMetaDetailsHref } = require('stremio/common/getMetaDetailsHref');
const MetaItem = require('stremio/components/MetaItem');
const { t } = require('i18next');

const LibItem = ({ _id, type, removable, notifications, watched, detailsVideosFirst, progress, deepLinks, optionOnSelect, ...props }) => {
    const navigate = useNavigate();
    const { navigateWithOrigin } = useNavigateWithOrigin();
    // No backend field for watched — local only.
    const [localWatched, setLocalWatched] = React.useState(!!watched);
    React.useEffect(() => {
        setLocalWatched(!!watched);
    }, [watched]);
    const detailsHref = React.useMemo(() => getMetaDetailsHref(deepLinks, detailsVideosFirst), [deepLinks, detailsVideosFirst]);
    const playerHref = deepLinks && typeof deepLinks.player === 'string' ? deepLinks.player : null;

    const newVideos = React.useMemo(() => {
        const count = notifications.items?.[_id]?.length ?? 0;
        return Math.min(Math.max(count, 0), 99);
    }, [_id, notifications]);

    const options = React.useMemo(() => {
        return [
            { label: 'LIBRARY_PLAY', value: 'play' },
            { label: 'LIBRARY_DETAILS', value: 'details' },
            { label: 'LIBRARY_RESUME_DISMISS', value: 'dismiss' },
            { label: localWatched ? 'CTX_MARK_UNWATCHED' : 'CTX_MARK_WATCHED', value: 'watched' },
            { label: 'LIBRARY_REMOVE', value: 'remove' },
        ].filter(({ value }) => {
            switch (value) {
                case 'play':
                    return typeof playerHref === 'string';
                case 'details':
                    return typeof detailsHref === 'string';
                case 'watched':
                    return typeof watched !== 'undefined' && typeof detailsHref === 'string';
                case 'dismiss':
                    return typeof _id === 'string' && progress !== null && !isNaN(progress) && progress > 0;
                case 'remove':
                    return typeof _id === 'string' && removable;
                default:
                    return false;
            }
        }).map((option) => ({
            ...option,
            label: t(option.label)
        }));
    }, [_id, removable, progress, playerHref, detailsHref, watched, localWatched]);

    const optionOnSelect = React.useCallback((event) => {
        if (typeof optionOnSelect === 'function') {
            optionOnSelect(event);
        }

        if (!event.nativeEvent.optionSelectPrevented) {
            switch (event.value) {
                case 'play': {
                    if (typeof playerHref === 'string') {
                        navigate(toPath(playerHref));
                    }

                    break;
                }
                case 'details': {
                    if (typeof detailsHref === 'string') {
                        navigateWithOrigin(detailsHref);
                    }

                    break;
                }
                case 'watched': {
                    // No backend field for watched — local only.
                    setLocalWatched((prev) => !prev);

                    break;
                }
                case 'dismiss': {
                    if (typeof _id === 'string' && typeof type === 'string') {
                        fetch(`/api/users/progress/${encodeURIComponent(type)}/${encodeURIComponent(_id)}`, {
                            method: 'DELETE',
                            credentials: 'same-origin',
                        }).then(() => {
                            window.dispatchEvent(new Event('stremio-local-library-changed'));
                        }).catch(() => undefined);
                    }

                    break;
                }
                case 'remove': {
                    if (typeof _id === 'string' && typeof type === 'string') {
                        const libraryUrl = `/api/users/library/${encodeURIComponent(type)}/${encodeURIComponent(_id)}`;
                        const progressUrl = `/api/users/progress/${encodeURIComponent(type)}/${encodeURIComponent(_id)}`;
                        fetch(libraryUrl, {
                            method: 'DELETE',
                            credentials: 'same-origin',
                        }).then(() => {
                            return fetch(progressUrl, {
                                method: 'DELETE',
                                credentials: 'same-origin',
                            });
                        }).then(() => {
                            window.dispatchEvent(new Event('stremio-local-library-changed'));
                        }).catch(() => undefined);
                    }

                    break;
                }
            }
        }
    }, [_id, type, detailsHref, navigate, navigateWithOrigin, playerHref, optionOnSelect]);

    const onPlayClick = React.useCallback((event) => {
        event.preventDefault();
        if (typeof playerHref === 'string') {
            navigate(toPath(playerHref));
        }
    }, [navigate, playerHref]);

    return (
        <MetaItem
            {...props}
            type={type}
            progress={progress}
            deepLinks={deepLinks}
            href={detailsHref}
            watched={localWatched}
            newVideos={newVideos}
            options={options}
            optionOnSelect={optionOnSelect}
            onPlayClick={typeof playerHref === 'string' && progress > 0 ? onPlayClick : null}
        />
    );
};

LibItem.propTypes = {
    _id: PropTypes.string,
    type: PropTypes.string,
    removable: PropTypes.bool,
    progress: PropTypes.number,
    notifications: PropTypes.object,
    watched: PropTypes.bool,
    detailsVideosFirst: PropTypes.bool,
    actionMenu: PropTypes.bool,
    deepLinks: PropTypes.shape({
        metaDetailsVideos: PropTypes.string,
        metaDetailsStreams: PropTypes.string,
        player: PropTypes.string
    }),
    optionOnSelect: PropTypes.func
};

module.exports = LibItem;
