// Copyright (C) 2017-2023 Smart code 203358507

import React, { memo } from 'react';
import classnames from 'classnames';
import { Link } from 'react-router-dom';
import { VerticalNavBar } from 'stremio/components/NavBar';
import NavMenu from 'stremio/components/NavBar/HorizontalNavBar/NavMenu';
import Button from 'stremio/components/Button';
import Image from 'stremio/components/Image';
import Icon from 'stremio/components/BrandIcons';
import { useBranding } from 'stremio/branding/BrandingContext';
import { useContentGamepadNavigation, useVerticalNavGamepadNavigation } from 'stremio/services/GamepadNavigation';
import styles from './MainNavBars.less';

const STOCK_LOGO = '/brand/logo.svg';

const TABS = [
    { id: 'board', label: 'Board', icon: 'home', href: '/' },
    { id: 'search', label: 'SEARCH', icon: 'search', href: '/search' },
    { id: 'discover', label: 'Discover', icon: 'discover', href: '/discover' },
    { id: 'library', label: 'Library', icon: 'library', href: '/library' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar', href: '/calendar' },
    { id: 'settings', label: 'SETTINGS', icon: 'settings', href: '/settings' },
];

type Props = {
    className: string,
    route?: string,
    query?: string,
    children?: React.ReactNode,
    verticalNav?: boolean,
};

const SideBarLogo = () => {
    const { brand } = useBranding();
    const src = typeof brand.logo_url === 'string' && brand.logo_url.length > 0 ? brand.logo_url : STOCK_LOGO;
    return (
        <Link className={styles['logo-container']} title={'LinuxStream'} tabIndex={-1} to={'/'}>
            <Image
                className={styles['logo']}
                src={src}
                fallbackSrc={STOCK_LOGO}
                alt={' '}
            />
        </Link>
    );
};

const renderProfileLabel = ({ ref, className, onClick, children }: any) => (
    <Button ref={ref} className={classnames(className, styles['profile-button'])} title={'Profile'} tabIndex={-1} onClick={onClick}>
        <Icon className={styles['profile-icon']} name={'person-outline'} />
        {children}
    </Button>
);

const MainNavBars = memo(({ className, route, children, verticalNav = true }: Props) => {
    const navRef = React.useRef(null);
    const contentRef = React.useRef(null);

    const navRoute = route === 'continue_watching' ? 'library' : (route ?? '');
    useContentGamepadNavigation(contentRef, navRoute);
    useVerticalNavGamepadNavigation(navRef, navRoute);

    return (
        <div className={classnames(className, styles['main-nav-bars-container'])}>
            {
                verticalNav ?
                    <div className={styles['side-bar']}>
                        <SideBarLogo />
                        <VerticalNavBar
                            ref={navRef}
                            className={styles['vertical-nav-bar']}
                            selected={route}
                            tabs={TABS}
                        />
                        <NavMenu direction={'top-right'} portal={true} menuClassName={styles['profile-menu']} renderLabel={renderProfileLabel} />
                    </div>
                    :
                    null
            }
            <div ref={contentRef} className={styles['nav-content-container']}>{children}</div>
        </div>
    );
});

export default MainNavBars;
