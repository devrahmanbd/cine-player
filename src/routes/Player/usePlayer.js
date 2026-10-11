// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useCore } = require('stremio/core');
const { useModelState, useCoreSuspender } = require('stremio/common');

const map = (player) => ({
    ...player,
    metaItem: player.metaItem !== null && player.metaItem.type === 'Ready' ?
        {
            ...player.metaItem,
            content: {
                ...player.metaItem.content,
                released: new Date(
                    typeof player.metaItem.content.released === 'string' ?
                        player.metaItem.content.released
                        :
                        NaN
                ),
                videos: player.metaItem.content.videos.map((video) => ({
                    ...video,
                    released: new Date(
                        typeof video.released === 'string' ?
                            video.released
                            :
                            NaN
                    ),
                }))
            }
        }
        :
        player.metaItem,
});

const usePlayer = (urlParams) => {
    const core = useCore();
    const { decodeStream } = useCoreSuspender();
    const stream = decodeStream(urlParams.stream);
    const action = React.useMemo(() => {
        if (stream !== null) {
            return {
                action: 'Load',
                args: {
                    model: 'Player',
                    args: {
                        stream,
                        streamRequest: typeof urlParams.streamTransportUrl === 'string' && typeof urlParams.type === 'string' && typeof urlParams.videoId === 'string' ?
                            {
                                base: urlParams.streamTransportUrl,
                                path: {
                                    resource: 'stream',
                                    type: urlParams.type,
                                    id: urlParams.videoId,
                                    extra: []
                                }
                            }
                            :
                            null,
                        metaRequest: typeof urlParams.metaTransportUrl === 'string' && typeof urlParams.type === 'string' && typeof urlParams.id === 'string' ?
                            {
                                base: urlParams.metaTransportUrl,
                                path: {
                                    resource: 'meta',
                                    type: urlParams.type,
                                    id: urlParams.id,
                                    extra: []
                                }
                            }
                            :
                            null,
                        subtitlesPath: typeof urlParams.type === 'string' && typeof urlParams.videoId === 'string' ?
                            {
                                resource: 'subtitles',
                                type: urlParams.type,
                                id: urlParams.videoId,
                                extra: []
                            }
                            :
                            null
                    }
                }
            };
        } else {
            return {
                action: 'Unload'
            };
        }
    }, [urlParams]);

    const player = useModelState({ model: 'player', action, map });

    const videoParamsChanged = React.useCallback((videoParams) => {
        core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'VideoParamsChanged',
                args: { videoParams }
            }
        }, 'player');
    }, []);
    const lastProgressRef = React.useRef({ time: 0, duration: 0 });
    const lastPutRef = React.useRef(0);
    const resolveSeasonEpisode = React.useCallback(() => {
        const videos = player.metaItem !== null && player.metaItem.type === 'Ready' && Array.isArray(player.metaItem.content.videos) ?
            player.metaItem.content.videos
            :
            null;
        if (!Array.isArray(videos) || typeof urlParams.videoId !== 'string') {
            return {};
        }
        const match = videos.find((video) => video !== null && typeof video === 'object' && video.id === urlParams.videoId) || null;
        if (match !== null && typeof match.season === 'number' && typeof match.episode === 'number' && Number.isFinite(match.season) && Number.isFinite(match.episode)) {
            return { season: match.season, episode: match.episode };
        }
        return {};
    }, [player.metaItem, urlParams.videoId]);
    const timeChanged = React.useCallback((time, duration, device) => {
        // live streams have no duration - report 0 instead of skipping the
        // action, otherwise the library item is never updated while watching
        if (typeof time !== 'number' || typeof device !== 'string') {
            return;
        }
        if (typeof urlParams.type !== 'string' || typeof urlParams.id !== 'string') {
            return;
        }
        const position = Math.max(0, Math.round(time));
        const total = typeof duration === 'number' ? Math.max(0, Math.round(duration)) : 0;
        lastProgressRef.current = { time: position, duration: total };
        const now = Date.now();
        if (now - lastPutRef.current < 10000 && position !== total) {
            return;
        }
        lastPutRef.current = now;
        const extra = resolveSeasonEpisode();
        const body = {
            type: urlParams.type,
            meta_id: urlParams.id,
            position,
            duration: total,
        };
        if (typeof extra.season === 'number') {
            body.season = extra.season;
        }
        if (typeof extra.episode === 'number') {
            body.episode = extra.episode;
        }
        fetch('/api/users/progress', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(body),
        }).then(() => {
            window.dispatchEvent(new Event('stremio-local-library-changed'));
        }).catch(() => undefined);
    }, [urlParams.type, urlParams.id, resolveSeasonEpisode]);

    const seek = React.useCallback((time, duration, device) => {
        if (typeof time === 'number' && typeof duration === 'number' && typeof device === 'string') {
            core.transport.dispatch({
                action: 'Player',
                args: {
                    action: 'Seek',
                    args: {
                        time: Math.max(0, Math.round(time)),
                        duration: Math.max(0, Math.round(duration)),
                        device,
                    }
                }
            }, 'player');
        }
    }, []);

    const ended = React.useCallback(() => {
        if (typeof urlParams.type !== 'string' || typeof urlParams.id !== 'string') {
            return;
        }
        const current = lastProgressRef.current;
        const extra = resolveSeasonEpisode();
        const body = {
            type: urlParams.type,
            meta_id: urlParams.id,
            position: current.time,
            duration: current.duration,
        };
        if (typeof extra.season === 'number') {
            body.season = extra.season;
        }
        if (typeof extra.episode === 'number') {
            body.episode = extra.episode;
        }
        fetch('/api/users/progress', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(body),
        }).then(() => {
            window.dispatchEvent(new Event('stremio-local-library-changed'));
        }).catch(() => undefined);
    }, [urlParams.type, urlParams.id, resolveSeasonEpisode]);
    const pausedChanged = React.useCallback((paused) => {
        core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'PausedChanged',
                args: { paused }
            }
        }, 'player');
    }, []);
    const nextVideo = React.useCallback(() => {
        core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'NextVideo'
            }
        }, 'player');
    }, []);

    const streamStateChanged = React.useCallback((partialStreamState) => {
        return core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'StreamStateChanged',
                args: {
                    state: {
                        ...player.streamState,
                        ...partialStreamState,
                    },
                },
            },
        }, 'player');
    }, [player.streamState]);

    const audioPreferenceChanged = React.useCallback((preference) => {
        return core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'AudioPreferenceChanged',
                args: { preference },
            },
        }, 'player');
    }, []);

    const subtitlePreferenceChanged = React.useCallback((preference) => {
        return core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'SubtitlePreferenceChanged',
                args: { preference },
            },
        }, 'player');
    }, []);

    const videoScaleChanged = React.useCallback((videoScale) => {
        return core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'VideoScaleChanged',
                args: { videoScale },
            },
        }, 'player');
    }, []);

    return [player, videoParamsChanged, streamStateChanged, audioPreferenceChanged, subtitlePreferenceChanged, videoScaleChanged, timeChanged, seek, pausedChanged, ended, nextVideo];
};

module.exports = usePlayer;
