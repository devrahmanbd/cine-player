// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Top system panel: brand mark, tray dots (decorative), live clock.
const React = require('react');
const { useBranding } = require('../../branding/BrandingContext');

function useClock() {
    const [now, setNow] = React.useState(() => new Date());
    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const SystemPanel = () => {
    const { brand } = useBranding();
    const clock = useClock();
    return (
        <div className={'lx-system-panel'}>
            <span className={'lx-brand'}>{brand.site_name}</span>
            <div className={'lx-tray'} aria-hidden={true}>
                <span className={'lx-tray-dot'} />
                <span className={'lx-tray-dot'} />
                <span className={'lx-tray-dot'} />
            </div>
            <span className={'lx-clock'}>{clock}</span>
        </div>
    );
};

module.exports = SystemPanel;
