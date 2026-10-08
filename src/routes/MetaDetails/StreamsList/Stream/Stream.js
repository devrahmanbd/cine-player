// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('stremio/components/BrandIcons');
const { t } = require('i18next');
const { useCore } = require('stremio/core');
const { useProfile, usePlatform, useToast, useBinaryState } = require('stremio/common');
const { Button, Image, Popup } = require('stremio/components');
const ActionButton = require('stremio/components/MetaPreview/ActionButton');
const { default: useRouteFocused } = require('stremio/common/useRouteFocused');
const StreamPlaceholder = require('./StreamPlaceholder');
const { maskStreamName, maskStreamDescription } = require('../../../../branding/streamNames');
const styles = require('./styles');

const Stream = ({ className = '', compact = false, isEpg = false, videoId = undefined, videoReleased = undefined, addonName, name, description, thumbnail = undefined, progress, deepLinks, externalPlayerCallbackCanMarkWatched, ...props }) => {
    const profile = useProfile();
    const toast = useToast();
    const platform = usePlatform();
    const core = useCore();
    const routeFocused = useRouteFocused();

    const [menuOpen, openMenu, closeMenu, toggleMenu] = useBinaryState(false);

    const popupLabelOnMouseUp = React.useCallback((event) => {
        if (!event.nativeEvent.togglePopupPrevented) {
            if (event.nativeEvent.ctrlKey || event.nativeEvent.button === 2) {
                event.preventDefault();
                openMenu();
            }
        }
    }, [openMenu]);
    const popupLabelOnContextMenu = React.useCallback((event) => {
        // Native menu is always suppressed on stream rows: link URLs must
        // never be reachable (no copy/download/external exits).
        event.preventDefault();
    }, []);
    const popupLabelOnLongPress = React.useCallback((event) => {
        if (event.nativeEvent.pointerType !== 'mouse' && !event.nativeEvent.togglePopupPrevented) {
            toggleMenu();
        }
    }, [toggleMenu]);
    const popupMenuOnPointerDown = React.useCallback((event) => {
        event.nativeEvent.togglePopupPrevented = true;
    }, []);
    const popupMenuOnContextMenu = React.useCallback((event) => {
        event.nativeEvent.togglePopupPrevented = true;
        event.preventDefault();
    }, []);
    const popupMenuOnClick = React.useCallback((event) => {
        event.nativeEvent.togglePopupPrevented = true;
    }, []);
    const popupMenuOnKeyDown = React.useCallback((event) => {
        event.nativeEvent.buttonClickPrevented = true;
    }, []);

    // Play-only: always the internal player link. No external apps, no new
    // tabs, no direct downloads — deepLinks.externalPlayer is ignored.
    const href = React.useMemo(() => {
        return deepLinks ? deepLinks.player : null;
    }, [deepLinks]);

    const markVideoAsWatched = React.useCallback(() => {
        if (typeof videoId === 'string') {
            core.transport.dispatch({
                action: 'MetaDetails',
                args: {
                    action: 'MarkVideoAsWatched',
                    args: [{ id: videoId, released: videoReleased }, true]
                }
            });
        }
    }, [videoId, videoReleased]);

    const onClick = React.useCallback((event) => {
        if (event.nativeEvent.togglePopupPrevented) {
            return;
        }

        if (isEpg) closeMenu();

        if (profile.settings.playerType !== null) {
            if (profile.settings.playerType !== 'infuse' || !platform.shell.active || !externalPlayerCallbackCanMarkWatched) {
                markVideoAsWatched();
            }
            toast.show({
                type: 'success',
                title: 'Stream opened in external player',
                timeout: 4000
            });
        }

        if (typeof props.onClick === 'function') {
            props.onClick(event);
        }
    }, [props.onClick, profile.settings.playerType, platform.shell.active, externalPlayerCallbackCanMarkWatched, markVideoAsWatched, isEpg, closeMenu]);

    const renderThumbnailFallback = React.useCallback(() => (
        <Icon className={styles['placeholder-icon']} name={'ic_broken_link'} />
    ), []);

    const displayName = maskStreamName(name || addonName);
    const displayDescription = maskStreamDescription(description);

    const renderLabel = React.useMemo(() => function renderLabel({ className, children, ...props }) {
        if (compact) {
            return <ActionButton className={classnames(className, styles['stream-action'])} icon={'play'} label={displayName} variant={'wide'} href={href} onClick={onClick} {...props}>
                {children}
            </ActionButton>;
        }

        return (
            <Button className={classnames(className, styles['stream-container'], { 'active': menuOpen })} title={displayName} href={href} onClick={onClick} {...props}>
                <div className={styles['info-container']}>
                    {
                        typeof thumbnail === 'string' && thumbnail.length > 0 ?
                            <div className={styles['thumbnail-container']} title={displayName}>
                                <Image
                                    className={styles['thumbnail']}
                                    src={thumbnail}
                                    alt={' '}
                                    renderFallback={renderThumbnailFallback}
                                />
                            </div>
                            :
                            <div className={styles['addon-name-container']} title={displayName}>
                                <div className={styles['addon-name']}>{displayName}</div>
                            </div>
                    }
                    {
                        progress !== null && !isNaN(progress) && progress > 0 ?
                            <div className={styles['progress-bar-container']}>
                                <div className={styles['progress-bar']} style={{ width: `${progress}%` }} />
                                <div className={styles['progress-bar-background']} />
                            </div>
                            :
                            null
                    }
                </div>
                <div className={styles['description-container']} title={displayDescription}>{displayDescription}</div>
                <Icon className={styles['icon']} name={'play'} />
                {children}
            </Button>
        );
    }, [compact, thumbnail, progress, displayName, displayDescription, href, onClick, menuOpen]);

    const renderMenu = React.useMemo(() => function renderMenu() {
        return (
            <div className={styles['context-menu-content']} onPointerDown={popupMenuOnPointerDown} onContextMenu={popupMenuOnContextMenu} onClick={popupMenuOnClick} onKeyDown={popupMenuOnKeyDown}>
                <div className={styles['context-menu-title']}>
                    {displayName}
                </div>
                <Button className={styles['context-menu-option-container']} title={t('CTX_PLAY')} href={isEpg ? href : undefined} onClick={isEpg ? onClick : undefined}>
                    <Icon className={styles['menu-icon']} name={'play'} />
                    <div className={styles['context-menu-option-label']}>{t('CTX_PLAY')}</div>
                </Button>
            </div>
        );
    }, [onClick, isEpg, href, displayDescription]);

    React.useEffect(() => {
        if (!routeFocused) {
            closeMenu();
        }
    }, [routeFocused]);

    return (
        <Popup
            className={className}
            onMouseUp={popupLabelOnMouseUp}
            onLongPress={popupLabelOnLongPress}
            onContextMenu={popupLabelOnContextMenu}
            open={menuOpen}
            portal={isEpg}
            menuClassName={isEpg ? styles['epg-menu'] : undefined}
            onCloseRequest={closeMenu}
            renderLabel={renderLabel}
            renderMenu={renderMenu}
        />
    );
};

Stream.Placeholder = StreamPlaceholder;

Stream.propTypes = {
    className: PropTypes.string,
    compact: PropTypes.bool,
    isEpg: PropTypes.bool,
    videoId: PropTypes.string,
    videoReleased: PropTypes.instanceOf(Date),
    addonName: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    thumbnail: PropTypes.string,
    progress: PropTypes.number,
    deepLinks: PropTypes.shape({
        player: PropTypes.string,
        externalPlayer: PropTypes.shape({
            download: PropTypes.string,
            magnet: PropTypes.string,
            streaming: PropTypes.string,
            playlist: PropTypes.string,
            fileName: PropTypes.string,
            web: PropTypes.string,
            openPlayer: PropTypes.shape({
                ios: PropTypes.string,
                android: PropTypes.string,
                windows: PropTypes.string,
                macos: PropTypes.string,
                linux: PropTypes.string,
            })
        })
    }),
    externalPlayerCallbackCanMarkWatched: PropTypes.bool,
    onClick: PropTypes.func
};

module.exports = Stream;
