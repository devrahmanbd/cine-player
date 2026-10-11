// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');

const metaCache = new Map();

const progressPercent = (position, duration) => {
    const pos = typeof position === 'number' && Number.isFinite(position) ? position : 0;
    const dur = typeof duration === 'number' && Number.isFinite(duration) ? duration : 0;
    const base = Math.max(dur, 1);
    const pct = Math.round((pos / base) * 100);
    if (!Number.isFinite(pct) || pct < 0) {
        return 0;
    }
    if (pct > 100) {
        return 100;
    }
    return pct;
};

const mapMetaDetails = (metaDetails) => ({
    ...metaDetails,
    metaItem: metaDetails.metaItem !== null && metaDetails.metaItem.content.type === 'Ready' ?
        {
            ...metaDetails.metaItem,
            content: {
                ...metaDetails.metaItem.content,
                content: {
                    ...metaDetails.metaItem.content.content,
                    released: new Date(
                        typeof metaDetails.metaItem.content.content.released === 'string' ?
                            metaDetails.metaItem.content.content.released
                            :
                            NaN
                    ),
                    videos: Array.isArray(metaDetails.metaItem.content.content.videos) ?
                        metaDetails.metaItem.content.content.videos.map((video) => ({
                            ...video,
                            released: new Date(
                                typeof video.released === 'string' ?
                                    video.released
                                    :
                                    NaN
                            ),
                        }))
                        :
                        []
                }
            }
        }
        :
        metaDetails.metaItem
});

const resolveVideo = (videos, season, episode) => {
    if (!Array.isArray(videos) || videos.length === 0) {
        return null;
    }
    if (typeof season === 'number' && typeof episode === 'number' && Number.isFinite(season) && Number.isFinite(episode)) {
        const match = videos.find((video) => video && video.season === season && video.episode === episode);
        if (match) {
            return match;
        }
    }
    return videos[0] || null;
};

const buildLocalItem = (type, metaId, metaContent, progressRow) => {
    const progress = progressRow ? progressPercent(progressRow.position, progressRow.duration) : 0;
    const videos = Array.isArray(metaContent.videos) ? metaContent.videos : [];
    const season = progressRow !== null && typeof progressRow === 'object' && typeof progressRow.season === 'number' ?
        progressRow.season
        :
        null;
    const episode = progressRow !== null && typeof progressRow === 'object' && typeof progressRow.episode === 'number' ?
        progressRow.episode
        :
        null;
    const video = resolveVideo(videos, season, episode);
    const links = metaContent.deepLinks !== null && typeof metaContent.deepLinks === 'object' ? metaContent.deepLinks : {};
    const deepLinks = {
        metaDetailsVideos: typeof links.metaDetailsVideos === 'string' ? links.metaDetailsVideos : null,
        metaDetailsStreams: typeof links.metaDetailsStreams === 'string' ? links.metaDetailsStreams : null,
    };
    if (video !== null && video.deepLinks !== null && typeof video.deepLinks === 'object' && typeof video.deepLinks.player === 'string') {
        deepLinks.player = video.deepLinks.player;
    }
    return {
        _id: metaId,
        type,
        name: typeof metaContent.name === 'string' && metaContent.name.length > 0 ? metaContent.name : metaId,
        poster: typeof metaContent.poster === 'string' ? metaContent.poster : null,
        posterShape: typeof metaContent.posterShape === 'string' ? metaContent.posterShape : 'poster',
        released: metaContent.released instanceof Date ? metaContent.released : null,
        progress,
        watched: false,
        newVideos: 0,
        deepLinks,
    };
};

const buildFallbackItem = (type, metaId, progressRow) => {
    const progress = progressRow ? progressPercent(progressRow.position, progressRow.duration) : 0;
    const href = `/metadetails/${encodeURIComponent(type)}/${encodeURIComponent(metaId)}`;
    return {
        _id: metaId,
        type,
        name: metaId,
        poster: null,
        posterShape: 'poster',
        released: null,
        progress,
        watched: false,
        newVideos: 0,
        deepLinks: {
            metaDetailsVideos: href,
            metaDetailsStreams: href,
        },
    };
};

const useLocalLibrary = () => {
    const { useCore } = require('stremio/core');
    const core = useCore();
    const [items, setItems] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const seqRef = React.useRef(0);

    const fetchMetaContent = React.useCallback(async (type, id) => {
        const key = `${type}:${id}`;
        if (metaCache.has(key)) {
            return metaCache.get(key);
        }
        const action = {
            action: 'Load',
            args: {
                model: 'MetaDetails',
                args: {
                    metaPath: {
                        resource: 'meta',
                        type,
                        id,
                        extra: []
                    },
                    streamPath: null,
                    guessStream: false
                }
            }
        };
        await core.transport.dispatch(action, 'meta_details');
        const deadline = Date.now() + 10000;
        while (Date.now() < deadline) {
            const state = await core.transport.getState('meta_details');
            const mapped = mapMetaDetails(state);
            const selected = mapped.selected;
            const selectedMatches = selected === null || selected.metaPath.type === type && selected.metaPath.id === id;
            const metaItem = mapped.metaItem;
            if (selectedMatches && metaItem !== null && metaItem.content.type === 'Ready') {
                if (metaItem.content.content.id === id) {
                    metaCache.set(key, metaItem.content.content);
                    return metaItem.content.content;
                }
            }
            if (selectedMatches && metaItem !== null && metaItem.content.type === 'Err') {
                return null;
            }
            await new Promise((resolve) => setTimeout(resolve, 150));
        }
        try {
            const state = await core.transport.getState('meta_details');
            const mapped = mapMetaDetails(state);
            if (mapped.metaItem !== null && mapped.metaItem.content.type === 'Ready' && mapped.metaItem.content.content.id === id) {
                metaCache.set(key, mapped.metaItem.content.content);
                return mapped.metaItem.content.content;
            }
        } catch (_) {
            // Fall through to null below.
        }
        return null;
    }, [core]);

    const refresh = React.useCallback(async () => {
        const seq = seqRef.current + 1;
        seqRef.current = seq;
        setLoading(true);
        setError('');
        try {
            const [libraryResponse, progressResponse] = await Promise.all([
                fetch('/api/users/library', { credentials: 'same-origin' }),
                fetch('/api/users/progress', { credentials: 'same-origin' }),
            ]);
            if (libraryResponse.status === 401 || progressResponse.status === 401) {
                if (seqRef.current !== seq) {
                    return [];
                }
                setItems([]);
                setLoading(false);
                setError('');
                return [];
            }
            if (!libraryResponse.ok) {
                throw new Error('library request failed');
            }
            if (!progressResponse.ok) {
                throw new Error('progress request failed');
            }
            const libraryRows = await libraryResponse.json();
            const progressRows = await progressResponse.json();
            const rows = Array.isArray(libraryRows) ? libraryRows : [];
            const progresses = Array.isArray(progressRows) ? progressRows : [];
            const nextItems = [];
            for (const row of rows) {
                if (row === null || typeof row !== 'object' || typeof row.type !== 'string' || typeof row.meta_id !== 'string') {
                    continue;
                }
                const { type, meta_id } = row;
                let metaContent = null;
                try {
                    metaContent = await fetchMetaContent(type, meta_id);
                } catch (_) {
                    metaContent = null;
                }
                if (seqRef.current !== seq) {
                    return [];
                }
                const progressRow = progresses.find((entry) => entry !== null && typeof entry === 'object' && entry.type === type && entry.meta_id === meta_id) || null;
                if (metaContent !== null) {
                    nextItems.push(buildLocalItem(type, meta_id, metaContent, progressRow));
                } else {
                    nextItems.push(buildFallbackItem(type, meta_id, progressRow));
                }
            }
            if (seqRef.current !== seq) {
                return [];
            }
            setItems(nextItems);
            setLoading(false);
            setError('');
            return nextItems;
        } catch (err) {
            if (seqRef.current !== seq) {
                return [];
            }
            setItems([]);
            setLoading(false);
            setError(err && typeof err.message === 'string' && err.message.length > 0 ? err.message : 'request failed');
            return [];
        }
    }, [fetchMetaContent]);

    React.useEffect(() => {
        refresh().catch(() => {
            // Anonymous visitors have no session; the hook stays empty.
        });
    }, [refresh]);

    const addToLibrary = React.useCallback(async (type, meta_id) => {
        const response = await fetch('/api/users/library', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ type, meta_id }),
        });
        if (response.status === 401) {
            await refresh();
            return null;
        }
        if (!response.ok) {
            throw new Error('request failed');
        }
        const nextItems = await refresh();
        return nextItems.find((item) => item.type === type && item._id === meta_id) || null;
    }, [refresh]);

    const removeFromLibrary = React.useCallback(async (type, meta_id) => {
        await fetch(`/api/users/library/${encodeURIComponent(type)}/${encodeURIComponent(meta_id)}`, {
            method: 'DELETE',
            credentials: 'same-origin',
        });
        await refresh();
    }, [refresh]);

    const updateProgress = React.useCallback(async (type, meta_id, details) => {
        const input = details !== null && typeof details === 'object' ? details : {};
        const response = await fetch('/api/users/progress', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                type,
                meta_id,
                position: input.position,
                duration: input.duration,
                season: input.season ?? null,
                episode: input.episode ?? null,
            }),
        });
        if (response.status === 401) {
            await refresh();
            return;
        }
        if (!response.ok) {
            throw new Error('request failed');
        }
        await refresh();
    }, [refresh]);

    const removeProgress = React.useCallback(async (type, meta_id) => {
        await fetch(`/api/users/progress/${encodeURIComponent(type)}/${encodeURIComponent(meta_id)}`, {
            method: 'DELETE',
            credentials: 'same-origin',
        });
        await refresh();
    }, [refresh]);

    return {
        items,
        loading,
        error,
        refresh,
        addToLibrary,
        removeFromLibrary,
        updateProgress,
        removeProgress,
    };
};

module.exports = useLocalLibrary;
module.exports.progressPercent = progressPercent;
module.exports.mapMetaDetails = mapMetaDetails;
module.exports.resolveVideo = resolveVideo;
module.exports.buildLocalItem = buildLocalItem;
module.exports.buildFallbackItem = buildFallbackItem;
module.exports.metaCache = metaCache;
