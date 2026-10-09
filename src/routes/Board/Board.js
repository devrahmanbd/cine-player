// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const classnames = require('classnames');
const useTranslate = require('stremio/common/useTranslate');
const { default: useVisibleCatalogs } = require('stremio/common/useVisibleCatalogs');
const { useStreamingServer, useNotifications, withCoreSuspender, useProfile } = require('stremio/common');
const { ContinueWatchingItem, EventModal, LiveTvContinueWatchingItem, MainNavBars, MetaItem, MetaRow } = require('stremio/components');
const useBoard = require('./useBoard');
const useContinueWatchingPreview = require('./useContinueWatchingPreview');
const { default: useLiveTvContinueWatching } = require('./useLiveTvContinueWatching');
const styles = require('./styles');
const { default: StreamingServerWarning } = require('./StreamingServerWarning');
const AdSlot = require('../../components/AdSlot/AdSlot');
const Billboard = require('../../components/Netflix/Billboard');

const THRESHOLD = 5;
const AVAILABILITY_FRESHNESS_MS = 36 * 60 * 60 * 1000;
const AVAILABILITY_FETCH_TIMEOUT_MS = 3000;
const AVAILABILITY_DEBOUNCE_MS = 150;

const getAvailabilityKey = (catalog, item) => {
    const rawType = typeof item?.type === 'string' && item.type.length > 0 ? item.type : catalog?.type;
    const type = typeof rawType === 'string' ? rawType.toLowerCase() : '';
    if (type !== 'movie' && type !== 'series') {
        return null;
    }
    if (typeof item?.id !== 'string' || item.id.length === 0) {
        return null;
    }
    return `${type}:${item.id}`;
};

const collectAvailabilityKeys = (catalogs) => {
    if (!Array.isArray(catalogs)) {
        return [];
    }
    const keys = new Set();
    catalogs.forEach((catalog) => {
        const items = catalog?.items ?? (catalog?.content?.type === 'Ready' ? catalog.content.content : null);
        if (!Array.isArray(items)) {
            return;
        }
        items.forEach((item) => {
            const key = getAvailabilityKey(catalog, item);
            if (key !== null) {
                keys.add(key);
            }
        });
    });
    return Array.from(keys).sort();
};

const isAvailabilityFresh = (row) => {
    if (row === null || typeof row !== 'object' || typeof row.checked_at !== 'string') {
        return false;
    }
    const checkedAt = Date.parse(row.checked_at);
    if (isNaN(checkedAt)) {
        return false;
    }
    return Date.now() - checkedAt < AVAILABILITY_FRESHNESS_MS;
};

const Board = () => {
    const t = useTranslate();
    const streamingServer = useStreamingServer();
    const continueWatchingPreview = useContinueWatchingPreview();
    const liveTvContinueWatching = useLiveTvContinueWatching();
    const [board, loadBoardRows] = useBoard();
    const notifications = useNotifications();
    const profile = useProfile();
    const liveTvCatalog = React.useMemo(() => ({
        items: (Array.isArray(liveTvContinueWatching.items) ? liveTvContinueWatching.items : [])
            .map((item) => ({ ...item, posterShape: 'landscape' })),
    }), [liveTvContinueWatching.items]);
    const boardCatalogsOffset =
        (continueWatchingPreview.items.length > 0 ? 1 : 0) +
        (liveTvCatalog.items.length > 0 ? 1 : 0);
    const showStreamingServerWarning = React.useMemo(() => {
        return streamingServer.settings !== null && streamingServer.settings.type === 'Err' && (
            isNaN(profile.settings.streamingServerWarningDismissed.getTime()) ||
            profile.settings.streamingServerWarningDismissed.getTime() < Date.now());
    }, [profile.settings, streamingServer.settings]);
    const { catalogRows, scrollContainerRef, onScroll } = useVisibleCatalogs({
        catalogs: board.catalogs,
        loadRange: loadBoardRows,
        leadingRows: boardCatalogsOffset,
        preloadRows: THRESHOLD,
    });
    const [availability, setAvailability] = React.useState({});
    const availabilityKeys = React.useMemo(() => {
        return collectAvailabilityKeys(board.catalogs);
    }, [board.catalogs]);
    const availabilityKeysIdentity = React.useMemo(() => {
        return availabilityKeys.join(',');
    }, [availabilityKeys]);
    React.useEffect(() => {
        if (availabilityKeysIdentity.length === 0) {
            setAvailability({});
            return undefined;
        }
        let disposed = false;
        let controller = null;
        let timeoutId = null;
        const debounceId = setTimeout(() => {
            controller = new AbortController();
            timeoutId = setTimeout(() => {
                controller.abort();
            }, AVAILABILITY_FETCH_TIMEOUT_MS);
            fetch(`/api/availability?keys=${encodeURIComponent(availabilityKeysIdentity)}`, { signal: controller.signal })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('AvailabilityRequestFailed');
                    }
                    return response.json();
                })
                .then((data) => {
                    if (!disposed && data !== null && typeof data === 'object') {
                        setAvailability(data);
                    }
                })
                .catch(() => {
                    if (!disposed) {
                        setAvailability({});
                    }
                })
                .finally(() => {
                    if (timeoutId !== null) {
                        clearTimeout(timeoutId);
                    }
                });
        }, AVAILABILITY_DEBOUNCE_MS);
        return () => {
            disposed = true;
            clearTimeout(debounceId);
            if (controller !== null) {
                controller.abort();
            }
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
        };
    }, [availabilityKeysIdentity]);
    const filteredCatalogRows = React.useMemo(() => {
        if (Object.keys(availability).length === 0) {
            return catalogRows;
        }
        const mapped = catalogRows.map(({ catalog, index }) => {
            const items = catalog?.items ?? (catalog?.content?.type === 'Ready' ? catalog.content.content : null);
            if (!Array.isArray(items)) {
                return { catalog, index };
            }
            const filtered = items.filter((item) => {
                const key = getAvailabilityKey(catalog, item);
                if (key === null) {
                    return true;
                }
                const row = availability[key];
                if (typeof row === 'undefined') {
                    return true;
                }
                if (!isAvailabilityFresh(row)) {
                    return true;
                }
                return row.available !== 0;
            });
            if (filtered.length === items.length) {
                return { catalog, index };
            }
            if (Array.isArray(catalog?.items)) {
                return { catalog: { ...catalog, items: filtered }, index };
            }
            if (catalog?.content?.type === 'Ready' && Array.isArray(catalog.content.content)) {
                return { catalog: { ...catalog, content: { ...catalog.content, content: filtered } }, index };
            }
            return { catalog, index };
        });
        return mapped.filter(({ catalog }) => {
            const items = catalog?.items ?? (catalog?.content?.type === 'Ready' ? catalog.content.content : null);
            if (!Array.isArray(items)) {
                return true;
            }
            return items.length > 0;
        });
    }, [catalogRows, availability]);
    const billboardItem = React.useMemo(() => {
        if (!Array.isArray(catalogRows)) {
            return null;
        }
        for (const row of catalogRows) {
            const catalog = row?.catalog;
            if (catalog?.content?.type !== 'Ready') {
                continue;
            }
            const items = catalog?.content?.content;
            if (!Array.isArray(items)) {
                continue;
            }
            for (const item of items) {
                const hasBackdrop = typeof item?.background === 'string' && item.background.length > 0;
                const hasName = typeof item?.name === 'string' && item.name.length > 0;
                if (hasBackdrop && hasName) {
                    return item;
                }
            }
        }
        return null;
    }, [catalogRows]);
    return (
        <div className={styles['board-container']}>
            <EventModal />
            <AdSlot slot={'banner_728x90'} />
            <MainNavBars className={styles['board-content-container']} route={'board'}>
                <div ref={scrollContainerRef} className={styles['board-content']} onScroll={onScroll}>
                    {
                        billboardItem !== null ?
                            <Billboard item={billboardItem} />
                            :
                            null
                    }
                    {
                        continueWatchingPreview.items.length > 0 ?
                            <MetaRow
                                className={classnames(styles['board-row'], styles['continue-watching-row'], 'animation-fade-in')}
                                title={t.string('BOARD_CONTINUE_WATCHING')}
                                catalog={continueWatchingPreview}
                                itemComponent={ContinueWatchingItem}
                                notifications={notifications}
                            />
                            :
                            null
                    }
                    {
                        liveTvCatalog.items.length > 0 ?
                            <MetaRow
                                className={classnames(styles['board-row'], styles['board-row-landscape'], 'animation-fade-in')}
                                title={t.string('BOARD_CONTINUE_WATCHING_LIVE')}
                                catalog={liveTvCatalog}
                                itemComponent={LiveTvContinueWatchingItem}
                                notifications={notifications}
                            />
                            :
                            null
                    }
                    {filteredCatalogRows.map(({ catalog, index }) => {
                        switch (catalog.content?.type) {
                            case 'Ready': {
                                return (
                                    <MetaRow
                                        key={index}
                                        className={classnames(styles['board-row'], styles[`board-row-${catalog.content.content[0]?.posterShape}`], 'animation-fade-in')}
                                        catalog={catalog}
                                        itemComponent={MetaItem}
                                    />
                                );
                            }
                            case 'Err': {
                                if (catalog.content.content !== 'EmptyContent') {
                                    return (
                                        <MetaRow
                                            key={index}
                                            className={classnames(styles['board-row'], 'animation-fade-in')}
                                            catalog={catalog}
                                            message={catalog.content.content}
                                        />
                                    );
                                }
                                return null;
                            }
                            default: {
                                return (
                                    <MetaRow.Placeholder
                                        key={index}
                                        className={classnames(styles['board-row'], styles['board-row-poster'], 'animation-fade-in')}
                                        catalog={catalog}
                                        title={t.catalogTitle(catalog)}
                                    />
                                );
                            }
                        }
                    })}
                </div>
            </MainNavBars>
            {
                showStreamingServerWarning ?
                    <StreamingServerWarning className={styles['board-warning-container']} />
                    :
                    null
            }
        </div>
    );
};

const BoardFallback = () => (
    <div className={styles['board-container']}>
        <MainNavBars className={styles['board-content-container']} route={'board'} />
    </div>
);

module.exports = withCoreSuspender(Board, BoardFallback);
