// Copyright (C) 2017-2024 Smart code 203358507

import React from 'react';
import { Params } from 'react-router';
import { useCore } from 'stremio/core';
import useLocalLibrary from 'stremio/common/useLocalLibrary';
import { getMonthInfo, bucketVideosByDate } from './calendarUtils';

type LocalLibraryItem = {
    _id: string,
    type: string,
    name: string,
    poster: string | null,
    posterShape: string,
    released: Date | null,
    progress: number,
    watched: boolean,
    newVideos: number,
    deepLinks: {
        metaDetailsVideos: string | null,
        metaDetailsStreams: string | null,
        player?: string,
    },
};

type LocalCalendarEntry = {
    id: string,
    name: string,
    poster?: string | null,
    title?: string,
    season?: number,
    episode?: number,
    released: unknown,
    deepLinks: { metaDetailsStreams: string },
};

type LocalCalendar = {
    selectable: CalendarSelectable,
    selected: CalendarSelected,
    monthInfo: CalendarMonthInfo,
    items: CalendarItem[],
    loading: boolean,
};

const metaVideosCache = new Map<string, unknown[]>();

const fetchMetaVideos = async (transport: CoreTransport, type: string, id: string): Promise<unknown[]> => {
    const key = `${type}:${id}`;
    if (metaVideosCache.has(key)) {
        return metaVideosCache.get(key) as unknown[];
    }
    await transport.dispatch({
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
    }, 'meta_details');
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
        const state = await transport.getState('meta_details') as MetaDetails;
        const selected = state.selected;
        const selectedMatches = selected === null || (selected.metaPath.type === type && selected.metaPath.id === id);
        const metaItem = state.metaItem;
        if (selectedMatches && metaItem !== null && metaItem.content.type === 'Ready') {
            if (metaItem.content.content.id === id) {
                const videos = Array.isArray(metaItem.content.content.videos) ? metaItem.content.content.videos : [];
                metaVideosCache.set(key, videos);
                return videos;
            }
        }
        if (selectedMatches && metaItem !== null && metaItem.content.type === 'Err') {
            return [];
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
    }
    try {
        const state = await transport.getState('meta_details') as MetaDetails;
        if (state.metaItem !== null && state.metaItem.content.type === 'Ready' && state.metaItem.content.content.id === id) {
            const videos = Array.isArray(state.metaItem.content.content.videos) ? state.metaItem.content.content.videos : [];
            metaVideosCache.set(key, videos);
            return videos;
        }
    } catch (_) {
        // Fall through to the empty result below.
    }
    return [];
};

const parseYearMonth = (urlParams: Readonly<Params<string>>) => {
    const now = new Date();
    const fallback = { year: now.getFullYear(), month: now.getMonth() + 1 };
    const year = urlParams.year ? parseInt(urlParams.year, 10) : fallback.year;
    const month = urlParams.month ? parseInt(urlParams.month, 10) : fallback.month;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return fallback;
    }
    return { year, month };
};

const shiftMonth = (year: number, month: number, delta: number): [number, number] => {
    const date = new Date(year, month - 1 + delta, 1);
    return [date.getFullYear(), date.getMonth() + 1];
};

const toEntryTitle = (video: unknown, fallback: string): string => {
    if (video !== null && typeof video === 'object' && 'title' in video) {
        const title = (video as { title: unknown }).title;
        if (typeof title === 'string' && title.length > 0) {
            return title;
        }
    }
    return fallback;
};

const toEntryNumber = (video: unknown, field: string): number | undefined => {
    if (video !== null && typeof video === 'object' && field in video) {
        const value = (video as Record<string, unknown>)[field];
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
    }
    return undefined;
};

const toEntryId = (video: unknown): string | null => {
    if (video !== null && typeof video === 'object' && 'id' in video) {
        const id = (video as { id: unknown }).id;
        if (typeof id === 'string' && id.length > 0) {
            return id;
        }
    }
    return null;
};

const useCalendar = (urlParams: Readonly<Params<string>>): LocalCalendar => {
    const core = useCore();
    const { items: libraryItems, loading: libraryLoading } = useLocalLibrary() as unknown as { items: LocalLibraryItem[], loading: boolean };
    const [seriesVideos, setSeriesVideos] = React.useState<LocalCalendarEntry[]>([]);
    const [videosLoading, setVideosLoading] = React.useState(true);

    const { year, month } = React.useMemo(() => parseYearMonth(urlParams), [urlParams]);

    const selectable = React.useMemo<CalendarSelectable>(() => {
        const [prevYear, prevMonth] = shiftMonth(year, month, -1);
        const [nextYear, nextMonth] = shiftMonth(year, month, 1);
        return {
            prev: { month: prevMonth, year: prevYear, selected: false, deepLinks: { calendar: `#/calendar/${prevYear}/${prevMonth}` } },
            next: { month: nextMonth, year: nextYear, selected: false, deepLinks: { calendar: `#/calendar/${nextYear}/${nextMonth}` } },
        };
    }, [year, month]);

    const selected = React.useMemo<CalendarSelected>(() => ({ day: 1, month, year }), [month, year]);

    React.useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setVideosLoading(true);
            const entries: LocalCalendarEntry[] = [];
            const seriesItems = libraryItems.filter((item) => item !== null && typeof item === 'object' && item.type === 'series');
            for (const item of seriesItems) {
                let videos: unknown[] = [];
                try {
                    videos = await fetchMetaVideos(core.transport, item.type, item._id);
                } catch (_) {
                    videos = [];
                }
                if (cancelled) {
                    return;
                }
                videos.forEach((video, index) => {
                    const videoId = toEntryId(video);
                    const streamsHref = typeof item.deepLinks.metaDetailsStreams === 'string' ? item.deepLinks.metaDetailsStreams : null;
                    if (streamsHref === null) {
                        return;
                    }
                    entries.push({
                        id: `${item._id}:${videoId !== null ? videoId : index}`,
                        name: item.name,
                        poster: item.poster,
                        title: toEntryTitle(video, item.name),
                        season: toEntryNumber(video, 'season'),
                        episode: toEntryNumber(video, 'episode'),
                        released: video !== null && typeof video === 'object' && 'released' in video ? (video as { released: unknown }).released : null,
                        deepLinks: {
                            metaDetailsStreams: videoId !== null ? `${streamsHref}/${encodeURIComponent(videoId)}` : streamsHref,
                        },
                    });
                });
            }
            if (!cancelled) {
                setSeriesVideos(entries);
                setVideosLoading(false);
            }
        };
        if (libraryLoading) {
            setVideosLoading(true);
            return;
        }
        load().catch(() => {
            if (!cancelled) {
                setSeriesVideos([]);
                setVideosLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [libraryItems, libraryLoading, core]);

    const monthInfo = React.useMemo(() => getMonthInfo(year, month), [year, month]);

    const items = React.useMemo(() => {
        const entries: LocalCalendarEntry[] = [...seriesVideos];
        libraryItems
            .filter((item) => item !== null && typeof item === 'object' && item.type === 'movie')
            .forEach((item) => {
                const streamsHref = typeof item.deepLinks.metaDetailsStreams === 'string' ? item.deepLinks.metaDetailsStreams : null;
                if (item.released === null || streamsHref === null) {
                    return;
                }
                entries.push({
                    id: item._id,
                    name: item.name,
                    poster: item.poster,
                    title: item.name,
                    season: undefined,
                    episode: undefined,
                    released: item.released,
                    deepLinks: { metaDetailsStreams: streamsHref },
                });
            });
        return bucketVideosByDate(entries, year, month);
    }, [seriesVideos, libraryItems, year, month]);

    return {
        selectable,
        selected,
        monthInfo,
        items,
        loading: libraryLoading || videosLoading,
    };
};

export default useCalendar;
