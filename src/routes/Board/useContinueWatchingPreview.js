// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const useLocalLibrary = require('stremio/common/useLocalLibrary');

const useContinueWatchingPreview = () => {
    const { items, refresh } = useLocalLibrary();

    React.useEffect(() => {
        const onChanged = () => {
            refresh().catch(() => undefined);
        };
        window.addEventListener('stremio-local-library-changed', onChanged);
        return () => {
            window.removeEventListener('stremio-local-library-changed', onChanged);
        };
    }, [refresh]);

    const previewItems = React.useMemo(() => {
        return items.filter((item) => typeof item.progress === 'number' && item.progress > 0);
    }, [items]);

    return React.useMemo(() => ({
        items: previewItems
    }), [previewItems]);
};

module.exports = useContinueWatchingPreview;
