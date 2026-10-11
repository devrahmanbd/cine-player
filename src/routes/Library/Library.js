// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useTranslation } = require('react-i18next');
const { useLocation, useParams, useNavigate } = require('react-router');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const NotFound = require('stremio/routes/NotFound');
const { useProfile, useNotifications, withCoreSuspender } = require('stremio/common');
const useLocalAuth = require('stremio/common/useLocalAuth');
const { default: toPath } = require('stremio-router/toPath');
const { DelayedRenderer, Image, MainNavBars, LibItem, MultiselectMenu } = require('stremio/components');
const { default: Placeholder } = require('./Placeholder');
const useLibrary = require('./useLibrary');
const styles = require('./styles');

function withModel(Library) {
    const LibraryWithModel = () => {
        const location = useLocation();
        const model = React.useMemo(() => {
            return typeof location.pathname === 'string' ?
                location.pathname.match('/library') ?
                    'library'
                    :
                    location.pathname.match('/continuewatching') ?
                        'continue_watching'
                        :
                        null
                :
                null;
        }, [location?.pathname]);

        if (model === null) return <NotFound />;

        return <Library model={model} />;
    };
    LibraryWithModel.displayName = 'LibraryWithModel';
    return LibraryWithModel;
}

const Library = ({ model }) => {
    const { type } = useParams();
    const urlParams = React.useMemo(() => ({
        type
    }), [type]);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const profile = useProfile();
    const { user: localUser } = useLocalAuth();
    const signedIn = profile.auth !== null || localUser !== null;
    const notifications = useNotifications();
    const [library] = useLibrary(model, urlParams);
    const basePath = model === 'continue_watching' ? '/continuewatching' : '/library';
    const typeSelect = React.useMemo(() => {
        const current = typeof type === 'string' && (type === 'movie' || type === 'series') ?
            `${basePath}/${type}`
            :
            basePath;
        return {
            options: [
                { value: basePath, label: t('TYPE_ALL') },
                { value: `${basePath}/movie`, label: t('TYPE_movie') },
                { value: `${basePath}/series`, label: t('TYPE_series') },
            ],
            value: current,
            onSelect: (value) => {
                navigate(toPath(value));
            }
        };
    }, [basePath, type, navigate, t]);
    const scrollContainerRef = React.useRef(null);
    React.useLayoutEffect(() => {
        if (scrollContainerRef.current !== null && library.selected !== null && library.catalog.length !== 0) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [profile.auth, localUser, library.selected]);
    return (
        <MainNavBars className={styles['library-container']} route={model}>
            {
                signedIn ?
                    <div className={styles['library-content']}>
                        <div className={styles['selectable-inputs-container']}>
                            <MultiselectMenu {...typeSelect} className={styles['select-input-container']} />
                        </div>
                        {
                            library.selected === null ?
                                <DelayedRenderer delay={500}>
                                    <div className={styles['message-container']}>
                                        <Image
                                            className={styles['image']}
                                            src={require('/assets/images/empty.png')}
                                            alt={' '}
                                        />
                                        <div className={styles['message-label']}>{model === 'library' ? t('LIBRARY_NOT_LOADED') : t('BOARD_CONTINUE_WATCHING_NOT_LOADED')}</div>
                                    </div>
                                </DelayedRenderer>
                                :
                                library.catalog.length === 0 ?
                                    <div className={styles['message-container']}>
                                        <Image
                                            className={styles['image']}
                                            src={require('/assets/images/empty.png')}
                                            alt={' '}
                                        />
                                        <div className={styles['message-label']}>{model === 'library' ? t('LIBRARY_EMPTY') : t('BOARD_CONTINUE_WATCHING_EMPTY')}</div>
                                    </div>
                                    :
                                    <div ref={scrollContainerRef} className={classnames(styles['meta-items-container'], 'animation-fade-in')}>
                                        {
                                            library.catalog.map((libItem, index) => (
                                                <LibItem
                                                    {...libItem}
                                                    key={index}
                                                    notifications={notifications}
                                                    removable={model === 'library'}
                                                    detailsVideosFirst={model === 'library'}
                                                />
                                            ))
                                        }
                                    </div>
                        }
                    </div>
                    :
                    <Placeholder />
            }
        </MainNavBars>
    );
};

Library.propTypes = {
    model: PropTypes.oneOf(['library', 'continue_watching']),
};

const LibraryFallback = ({ model }) => (
    <MainNavBars className={styles['library-container']} route={model} />
);

LibraryFallback.propTypes = Library.propTypes;

module.exports = withModel(withCoreSuspender(Library, LibraryFallback));
