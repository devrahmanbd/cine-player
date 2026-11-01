// Copyright (C) 2017-2026 Smart code 203358507

import { matchRoutes } from 'react-router';
import type { Location } from 'react-router';

export const PLAYER_PATH = '/player/:stream/:streamTransportUrl?/:metaTransportUrl?/:type?/:id?/:videoId?';
export const META_DETAILS_PATH = '/metadetails/:type?/:id?/:videoId?';
export const LEGACY_META_DETAILS_PATH = '/detail/:type?/:id?/:videoId?';
export const MOVIE_PATH = '/movie/:id?/:videoId?';
export const SERIES_PATH = '/series/:id?/:videoId?';

const routes = [PLAYER_PATH, META_DETAILS_PATH, LEGACY_META_DETAILS_PATH, MOVIE_PATH, SERIES_PATH].map((path) => ({ path }));

const getBackFallback = (location: Location): string => {
    const match = matchRoutes(routes, location)?.[0];
    if (match) {
        let { type, id, videoId } = match.params;
        if (!type && match.route.path === MOVIE_PATH) type = 'movie';
        if (!type && match.route.path === SERIES_PATH) type = 'series';
        const isPlayer = match.route.path === PLAYER_PATH;
        if (type && id && (isPlayer || videoId)) {
            return `/metadetails/${encodeURIComponent(type)}/${encodeURIComponent(id)}${isPlayer ? '' : location.search}`;
        }
    }

    return '/';
};

export default getBackFallback;
