// Copyright (C) 2017-2026 Smart code 203358507

import { useEffect } from 'react';
import { useMatch } from 'react-router';
import { isAdminRoute } from 'stremio/branding/adInjector';
import useServiceWorkerUpdater from './useServiceWorkerUpdater';

const WebUpdateScreen = () => {
    const { state, applyUpdate } = useServiceWorkerUpdater();
    const isPlayer = useMatch('/player/*');

    // Silent auto-updates everywhere except playback and admin work:
    // never interrupt a video or wipe an admin form mid-edit.
    useEffect(() => {
        if ((state.status === 'ready' || state.status === 'reload-ready') && isPlayer === null && !isAdminRoute()) {
            applyUpdate();
        }
    }, [applyUpdate, state.status, isPlayer]);

    // Update screen and notification banner removed completely:
    // updates apply silently in the background without UI interruption.
    return null;
};

export default WebUpdateScreen;
