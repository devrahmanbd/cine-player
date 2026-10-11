// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const useLocalLibrary = require('stremio/common/useLocalLibrary');

const useLibrary = (model, urlParams) => {
    const { items, loading, error, refresh } = useLocalLibrary();

    React.useEffect(() => {
        const onChanged = () => {
            refresh().catch(() => undefined);
        };
        window.addEventListener('stremio-local-library-changed', onChanged);
        return () => {
            window.removeEventListener('stremio-local-library-changed', onChanged);
        };
    }, [refresh]);

    const catalog = React.useMemo(() => {
        const type = urlParams !== null && typeof urlParams === 'object' && typeof urlParams.type === 'string' ?
            urlParams.type
            :
            null;
        let filtered = items;
        if (type === 'movie' || type === 'series') {
            filtered = filtered.filter((item) => item.type === type);
        }
        if (model === 'continue_watching') {
            filtered = filtered.filter((item) => typeof item.progress === 'number' && item.progress > 0);
        }
        return filtered;
    }, [items, model, urlParams]);

    const loadNextPage = React.useCallback(() => undefined, []);

    const library = React.useMemo(() => ({
        catalog,
        loading,
        error,
        selected: loading ? null : { type: urlParams !== null && typeof urlParams === 'object' ? urlParams.type || null : null },
    }), [catalog, loading, error, urlParams]);

    return [library, loadNextPage];
};

module.exports = useLibrary;
