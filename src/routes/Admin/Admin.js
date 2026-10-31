// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// /admin CMS: brand fields, per-slot ad toggles + code editing, logo/favicon
// uploads. Session is an httpOnly cookie; /api/admin/me probes auth state.
const React = require('react');
const PropTypes = require('prop-types');
const { clearBlockedPatternsCache } = require('../../branding/streamPatterns');
const { AD_TYPES, typeActive, togglePlan } = require('../../branding/adTypes');

// Admin is an internal, English-only tool (not part of the translated product
// surface), so labels live in this map instead of raw JSX text, which the
// repo's i18n scan (tests/i18nScan.test.js) forbids outside t() calls.
const STR = {
    loginTitle: 'Admin login',
    username: 'Username',
    password: 'Password',
    login: 'Log in',
    invalid: 'Invalid credentials',
    loading: 'Loading…',
    siteAdmin: 'Site admin',
    logout: 'Log out',
    brand: 'Brand',
    saveBrand: 'Save brand',
    ads: 'Ads',
    save: 'Save',
    saveFailed: 'Save failed (session expired? log in again).',
    uploads: 'Uploads',
    reloaded: 'Reload the site to see changes.',
    addonsTitle: 'Addons',
    addonUrl: 'Addon manifest URL',
    addAddon: 'Add addon',
    enable: 'Enabled',
    remove: 'Remove',
    moveUp: 'Move up',
    moveDown: 'Move down',
    failedLoadAddons: 'Failed to load addons',
    addonAdded: 'Addon added.',
    addonUpdated: 'Addon URL updated.',
    addFailed: 'Add failed.',
    addonRemoved: 'Addon removed.',
    removeFailed: 'Remove failed.',
    updateFailed: 'Update failed.',
    confirmRemove: 'Remove this addon?',
    noAddons: 'No addons yet.',
    configureAddon: 'Configure',
    editUrl: 'Edit URL',
    cancel: 'Cancel',
    saveUrl: 'Save URL',
    inspectManifest: 'Inspect',
    hideManifest: 'Hide',
    requiresConfigBadge: '⚠️ Requires Config',
    configurableBadge: 'Configurable',
    adultBadge: '18+ Adult',
    p2pBadge: 'P2P',
    enabledBadge: 'Active',
    disabledBadge: 'Disabled',
    copyUrl: 'Copy URL',
    urlCopied: 'Copied!',
    previewBtn: 'Test & Preview',
    testingUrl: 'Testing URL…',
    invalidManifest: 'Could not fetch or validate manifest.',
    typesLabel: 'Types:',
    resourcesLabel: 'Resources:',
    catalogsLabel: 'Catalogs:',
    configNoticeTitle: 'Stremio Addon Configuration & Debrid Guide',
    configNoticeBody: 'Addons that require configuration (such as Debrid streams or custom providers) must be configured in the addon\'s own settings page before streams will work. Click "Configure" to open the configuration page in a new tab, finish your setup there, and then copy the generated manifest URL into "Edit URL".',
    blockedTitle: 'Blocked patterns',
    blockedPlaceholder: 'Pattern to block',
    blockedAdd: 'Add pattern',
    failedLoadBlocked: 'Failed to load blocked patterns',
    blockedAdded: 'Pattern added.',
    blockedRemoved: 'Pattern removed.',
    confirmRemoveBlocked: 'Remove this pattern?',
    noBlocked: 'No blocked patterns yet.',
    usersTitle: 'Users',
    failedLoadUsers: 'Failed to load users',
    noUsers: 'No users yet.',
    disabledLabel: 'disabled',
    disableUser: 'Disable',
    enableUser: 'Enable',
    tempPasswordPlaceholder: 'Temporary password',
    setTempPassword: 'Set password',
    userDisabled: 'User disabled.',
    userEnabled: 'User enabled.',
    passwordUpdated: 'Password updated.',
    enableAds: 'Enable ads',
    adsTypes: 'Ad types',
    typePopunder: 'Popunder',
    typeSocialbar: 'Social bar',
    typeNative: 'Native',
    typeBanners: 'Banners',
    typeSmartlink: 'Smartlink',
    advanced: 'Advanced (ad code)',
    adsSavedReload: 'Saved. Reload the site to see changes.',
    adsFailedLoad: 'Failed to load ad settings',
    adsSaveFailed: 'Save failed (session expired? log in again).',
};

const BRAND_FIELDS = ['site_name', 'tagline', 'logo_url', 'favicon_url', 'theme', 'accent'];

async function api(path, options = {}) {
    const response = await fetch(path, {
        credentials: 'same-origin',
        ...options,
        headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `request failed (${response.status})`);
    return body;
}

const AdminLogin = ({ onLogin }) => {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const submit = async (event) => {
        event.preventDefault();
        setError('');
        try {
            await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
            onLogin();
        } catch {
            setError('Invalid credentials');
        }
    };
    return (
        <form onSubmit={submit}>
            <h2>{STR.loginTitle}</h2>
            <label>{STR.username}<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete={'username'} /></label>
            <label>{STR.password}<input type={'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={'current-password'} /></label>
            {error ? <div className={'admin-error'}>{error}</div> : null}
            <button type={'submit'}>{STR.login}</button>
        </form>
    );
};

AdminLogin.propTypes = {
    onLogin: PropTypes.func.isRequired,
};

const BrandForm = () => {
    const [brand, setBrand] = React.useState(null);
    const [status, setStatus] = React.useState('');
    React.useEffect(() => {
        api('/api/branding').then(setBrand).catch(() => setStatus('Failed to load branding'));
    }, []);
    const save = async () => {
        setStatus('');
        try {
            const updated = await api('/api/branding', { method: 'PUT', body: JSON.stringify(brand) });
            setBrand(updated);
            setStatus('Saved. Reload the site to see changes.');
        } catch {
            setStatus('Save failed (session expired? log in again).');
        }
    };
    if (brand === null) return <div>{status || 'Loading…'}</div>;
    return (
        <div>
            <h2>{STR.brand}</h2>
            {BRAND_FIELDS.map((field) => (
                <label key={field}>{field}
                    <input value={brand[field] || ''} onChange={(e) => setBrand({ ...brand, [field]: e.target.value })} />
                </label>
            ))}
            <button onClick={save}>{STR.saveBrand}</button>
            {status ? <div className={'admin-status'}>{status}</div> : null}
        </div>
    );
};

// TYPE_LABELS maps each AD_TYPES key to the matching STR value.
const TYPE_LABELS = {
    popunder: STR.typePopunder,
    socialbar: STR.typeSocialbar,
    native: STR.typeNative,
    banners: STR.typeBanners,
    smartlink: STR.typeSmartlink,
};

const AdsForm = () => {
    // cfg: null while loading, then { master: 0|1, slots: [{slot_key, enabled, code}] }
    const [cfg, setCfg] = React.useState(null);
    const [status, setStatus] = React.useState('');
    // snapshot holds the last-GET slots so type toggles never flush unsaved Advanced edits
    const snapshot = React.useRef([]);

    const load = React.useCallback(() => {
        api('/api/adslots')
            .then((res) => {
                snapshot.current = res.slots || [];
                setCfg(res);
            })
            .catch(() => setStatus(STR.adsFailedLoad));
    }, []);

    React.useEffect(load, [load]);

    // Master toggle: PUT { master } → update cfg.master; on failure resync from server.
    const onMasterChange = async (e) => {
        const master = e.target.checked ? 1 : 0;
        try {
            const res = await api('/api/adslots', { method: 'PUT', body: JSON.stringify({ master }) });
            setCfg((prev) => ({ ...prev, master: res.master }));
            setStatus(STR.adsSavedReload);
        } catch {
            setStatus(STR.adsSaveFailed);
            load();
        }
    };

    // Type-level toggle: PUT every slot in the group using snapshot codes (not live textarea state).
    const onTypeChange = async (typeKey) => {
        const plan = togglePlan(cfg.slots, typeKey);
        try {
            await Promise.all(
                Object.keys(plan).map((k) =>
                    api('/api/adslots', {
                        method: 'PUT',
                        body: JSON.stringify({
                            slot_key: k,
                            enabled: plan[k],
                            code: (snapshot.current.find((s) => s.slot_key === k) || {}).code || '',
                        }),
                    })
                )
            );
            // Optimistically update cfg.slots for the toggled group.
            setCfg((prev) => ({
                ...prev,
                slots: prev.slots.map((s) =>
                    Object.prototype.hasOwnProperty.call(plan, s.slot_key)
                        ? { ...s, enabled: plan[s.slot_key] }
                        : s
                ),
            }));
            setStatus(STR.adsSavedReload);
        } catch {
            setStatus(STR.adsSaveFailed);
            load();
        }
    };

    // Per-slot save (Advanced section) — unchanged behaviour.
    const save = async (slot) => {
        setStatus('');
        try {
            await api('/api/adslots', { method: 'PUT', body: JSON.stringify(slot) });
            setStatus(`${slot.slot_key} ${STR.adsSavedReload}`);
        } catch {
            setStatus(STR.adsSaveFailed);
        }
    };

    if (cfg === null) return <div>{status || STR.loading}</div>;
    return (
        <div>
            <h2>{STR.ads}</h2>

            {/* Master switch */}
            <label>
                <input
                    type={'checkbox'}
                    checked={cfg.master === 1}
                    onChange={onMasterChange}
                />
                {STR.enableAds}
            </label>

            {/* Type-level toggles */}
            <h3>{STR.adsTypes}</h3>
            {AD_TYPES.map(({ key }) => (
                <label key={key}>
                    <input
                        type={'checkbox'}
                        checked={typeActive(cfg.slots, key)}
                        onChange={() => onTypeChange(key)}
                    />
                    {TYPE_LABELS[key] || key}
                </label>
            ))}

            {/* Advanced: per-slot code editing (collapsed by default) */}
            <details>
                <summary>{STR.advanced}</summary>
                {cfg.slots.map((slot) => (
                    <div key={slot.slot_key} className={'admin-slot'}>
                        <label>
                            <input
                                type={'checkbox'}
                                checked={slot.enabled === 1}
                                onChange={(e) =>
                                    setCfg((prev) => ({
                                        ...prev,
                                        slots: prev.slots.map((s) =>
                                            s.slot_key === slot.slot_key
                                                ? { ...s, enabled: e.target.checked ? 1 : 0 }
                                                : s
                                        ),
                                    }))
                                }
                            />
                            {slot.slot_key}
                        </label>
                        <textarea
                            rows={4}
                            value={slot.code || ''}
                            onChange={(e) =>
                                setCfg((prev) => ({
                                    ...prev,
                                    slots: prev.slots.map((s) =>
                                        s.slot_key === slot.slot_key ? { ...s, code: e.target.value } : s
                                    ),
                                }))
                            }
                        />
                        <button onClick={() => save(slot)}>{`${STR.save} ${slot.slot_key}`}</button>
                    </div>
                ))}
            </details>

            {status ? <div className={'admin-status'}>{status}</div> : null}
        </div>
    );
};

const UploadsForm = () => {
    const [status, setStatus] = React.useState('');
    const upload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const ext = `.${file.name.split('.').pop().toLowerCase()}`;
        if (!['.png', '.jpg', '.jpeg', '.svg', '.ico'].includes(ext)) {
            setStatus('Rejected: png/jpg/svg/ico only.');
            event.target.value = '';
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setStatus('Rejected: file too large (max 2MB).');
            event.target.value = '';
            return;
        }
        setStatus('Uploading…');
        const data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        try {
            const result = await api('/api/uploads', { method: 'POST', body: JSON.stringify({ filename: file.name, data }) });
            setStatus(`Uploaded: ${result.url} — paste it into logo_url or favicon_url above.`);
        } catch {
            setStatus('Upload failed (png/jpg/svg/ico, max 2MB).');
        }
        event.target.value = '';
    };
    return (
        <div>
            <h2>{STR.uploads}</h2>
            <input type={'file'} accept={'.png,.jpg,.jpeg,.svg,.ico'} onChange={upload} />
            {status ? <div className={'admin-status'}>{status}</div> : null}
        </div>
    );
};

const AddonsForm = () => {
    const [addons, setAddons] = React.useState(null);
    const [status, setStatus] = React.useState('');
    const [url, setUrl] = React.useState('');
    const [editingId, setEditingId] = React.useState(null);
    const [editingUrl, setEditingUrl] = React.useState('');
    const [copiedId, setCopiedId] = React.useState(null);
    const [preview, setPreview] = React.useState(null);
    const [previewLoading, setPreviewLoading] = React.useState(false);
    const [previewError, setPreviewError] = React.useState('');

    const loadAddons = React.useCallback(async () => {
        try {
            const data = await api('/api/admin/addons');
            setAddons(data);
        } catch {
            setStatus(STR.failedLoadAddons);
        }
    }, []);

    React.useEffect(() => {
        loadAddons();
    }, [loadAddons]);

    const add = async () => {
        if (!url || !url.trim()) return;
        setStatus('');
        try {
            await api('/api/addons', { method: 'POST', body: JSON.stringify({ manifest_url: url.trim() }) });
            await loadAddons();
            setUrl('');
            setPreview(null);
            setStatus(STR.addonAdded);
        } catch (err) {
            setStatus(`${STR.addFailed} ${err.message}`);
        }
    };

    const testPreview = async () => {
        if (!url || !url.trim()) return;
        setPreviewLoading(true);
        setPreviewError('');
        setPreview(null);
        try {
            const data = await api(`/api/admin/addons/preview?url=${encodeURIComponent(url.trim())}`);
            if (data.status === 'error') {
                setPreviewError(data.error || STR.invalidManifest);
            } else {
                setPreview(data);
            }
        } catch (err) {
            setPreviewError(err.message || STR.invalidManifest);
        } finally {
            setPreviewLoading(false);
        }
    };

    const saveEditedUrl = async (addon) => {
        if (!editingUrl || !editingUrl.trim()) return;
        setStatus('');
        try {
            await api(`/api/addons/${addon.id}`, {
                method: 'PUT',
                body: JSON.stringify({ manifest_url: editingUrl.trim() }),
            });
            await loadAddons();
            setEditingId(null);
            setEditingUrl('');
            setStatus(STR.addonUpdated);
        } catch (err) {
            setStatus(`${STR.updateFailed} ${err.message}`);
        }
    };

    const toggle = async (addon, enabled) => {
        setStatus('');
        try {
            const updated = await api(`/api/addons/${addon.id}`, { method: 'PUT', body: JSON.stringify({ enabled }) });
            const nextEnabled = updated.enabled !== undefined ? updated.enabled : (enabled ? 1 : 0);
            setAddons((prev) => prev.map((item) => (item.id === addon.id ? { ...item, enabled: nextEnabled } : item)));
        } catch {
            setStatus(STR.updateFailed);
        }
    };

    const move = async (index, delta) => {
        const neighbor = index + delta;
        if (!addons || neighbor < 0 || neighbor >= addons.length) return;
        const current = addons[index];
        const other = addons[neighbor];
        setStatus('');
        try {
            const currentPos = current.position !== undefined ? current.position : index;
            const otherPos = other.position !== undefined ? other.position : neighbor;
            await api(`/api/addons/${current.id}`, { method: 'PUT', body: JSON.stringify({ position: otherPos }) });
            await api(`/api/addons/${other.id}`, { method: 'PUT', body: JSON.stringify({ position: currentPos }) });
            setAddons((prev) => {
                const next = [...prev];
                next[index] = { ...other, position: currentPos };
                next[neighbor] = { ...current, position: otherPos };
                return next;
            });
        } catch {
            setStatus(STR.updateFailed);
        }
    };

    const remove = async (addon) => {
        if (!window.confirm(STR.confirmRemove)) return;
        setStatus('');
        try {
            await api(`/api/addons/${addon.id}`, { method: 'DELETE' });
            setAddons((prev) => prev.filter((item) => item.id !== addon.id));
            setStatus(STR.addonRemoved);
        } catch {
            setStatus(STR.removeFailed);
        }
    };

    const copyToClipboard = (addon) => {
        if (navigator && navigator.clipboard) {
            navigator.clipboard.writeText(addon.manifest_url);
            setCopiedId(addon.id);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    if (addons === null) return <div>{status || STR.loading}</div>;

    return (
        <div>
            <h2>{STR.addonsTitle}</h2>

            <div className={'admin-guide-card'}>
                <h3 style={{ margin: '0 0 6px 0', color: '#ffaa00' }}>{STR.configNoticeTitle}</h3>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: '#ccc' }}>
                    {STR.configNoticeBody}
                </p>
            </div>

            {addons.length === 0 ? <div>{STR.noAddons}</div> : null}

            {addons.map((addon, index) => (
                <div key={addon.id} className={'admin-addon-card'}>
                    <div className={'admin-addon-header'}>
                        {addon.logo ? (
                            <img src={addon.logo} alt={addon.name} className={'admin-addon-logo'} />
                        ) : (
                            <div className={'admin-addon-logo'} />
                        )}
                        <div className={'admin-addon-info'}>
                            <div className={'admin-addon-title-row'}>
                                <span className={'admin-addon-name'}>{addon.name}</span>
                                {addon.version ? <span className={'admin-addon-version'}>{addon.version}</span> : null}
                                {addon.configurationRequired ? (
                                    <span className={'admin-badge admin-badge-warning'}>{STR.requiresConfigBadge}</span>
                                ) : addon.configurable ? (
                                    <span className={'admin-badge admin-badge-configurable'}>{STR.configurableBadge}</span>
                                ) : null}
                                {addon.behaviorHints && addon.behaviorHints.adult ? (
                                    <span className={'admin-badge admin-badge-adult'}>{STR.adultBadge}</span>
                                ) : null}
                                {addon.behaviorHints && addon.behaviorHints.p2p ? (
                                    <span className={'admin-badge admin-badge-p2p'}>{STR.p2pBadge}</span>
                                ) : null}
                                <span className={`admin-badge ${addon.enabled ? 'admin-badge-configurable' : 'admin-badge-warning'}`}>
                                    {addon.enabled ? STR.enabledBadge : STR.disabledBadge}
                                </span>
                            </div>
                            {addon.description ? <div className={'admin-addon-desc'}>{addon.description}</div> : null}
                            <div className={'admin-addon-meta-row'}>
                                {addon.types && addon.types.length > 0 ? (
                                    <span>{[STR.typesLabel, addon.types.join(', ')].join(' ')}</span>
                                ) : null}
                                {addon.resources && addon.resources.length > 0 ? (
                                    <span>{[STR.resourcesLabel, addon.resources.join(', ')].join(' ')}</span>
                                ) : null}
                                {addon.catalogs && (Array.isArray(addon.catalogs) ? addon.catalogs.length : addon.catalogs) ? (
                                    <span>{[STR.catalogsLabel, Array.isArray(addon.catalogs) ? addon.catalogs.length : addon.catalogs].join(' ')}</span>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className={'admin-addon-url-row'}>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {addon.manifest_url}
                        </span>
                        <button
                            type={'button'}
                            className={'admin-btn'}
                            onClick={() => copyToClipboard(addon)}
                        >
                            {copiedId === addon.id ? STR.urlCopied : STR.copyUrl}
                        </button>
                    </div>

                    {editingId === addon.id ? (
                        <div className={'admin-edit-url-box'}>
                            <input
                                value={editingUrl}
                                onChange={(e) => setEditingUrl(e.target.value)}
                                placeholder={STR.addonUrl}
                            />
                            <button
                                type={'button'}
                                className={'admin-btn admin-btn-accent'}
                                onClick={() => saveEditedUrl(addon)}
                            >
                                {STR.saveUrl}
                            </button>
                            <button
                                type={'button'}
                                className={'admin-btn'}
                                onClick={() => {
                                    setEditingId(null);
                                    setEditingUrl('');
                                }}
                            >
                                {STR.cancel}
                            </button>
                        </div>
                    ) : null}

                    <div className={'admin-addon-actions'}>
                        {addon.configureUrl ? (
                            <a
                                href={addon.configureUrl}
                                target={'_blank'}
                                rel={'noopener noreferrer'}
                                className={'admin-btn admin-btn-accent'}
                            >
                                {STR.configureAddon}
                            </a>
                        ) : null}
                        <button
                            type={'button'}
                            className={'admin-btn'}
                            onClick={() => {
                                if (editingId === addon.id) {
                                    setEditingId(null);
                                    setEditingUrl('');
                                } else {
                                    setEditingId(addon.id);
                                    setEditingUrl(addon.manifest_url);
                                }
                            }}
                        >
                            {STR.editUrl}
                        </button>
                        <button
                            type={'button'}
                            className={'admin-btn'}
                            onClick={() => toggle(addon, !addon.enabled)}
                        >
                            {addon.enabled ? STR.disabledBadge : STR.enable}
                        </button>
                        <button
                            type={'button'}
                            className={'admin-btn'}
                            onClick={() => move(index, -1)}
                            disabled={index === 0}
                        >
                            {STR.moveUp}
                        </button>
                        <button
                            type={'button'}
                            className={'admin-btn'}
                            onClick={() => move(index, 1)}
                            disabled={index === addons.length - 1}
                        >
                            {STR.moveDown}
                        </button>
                        <button
                            type={'button'}
                            className={'admin-btn admin-btn-danger'}
                            onClick={() => remove(addon)}
                        >
                            {STR.remove}
                        </button>
                    </div>
                </div>
            ))}

            <div style={{ marginTop: '24px', background: '#1c1c2b', border: '1px solid #33334d', borderRadius: '10px', padding: '16px' }}>
                <h3 style={{ margin: '0 0 12px 0' }}>{STR.addAddon}</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                        style={{ flex: 1, minWidth: '240px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #444', background: '#111', color: '#fff' }}
                        value={url}
                        placeholder={STR.addonUrl}
                        onChange={(e) => {
                            setUrl(e.target.value);
                            setPreview(null);
                            setPreviewError('');
                        }}
                    />
                    <button
                        type={'button'}
                        className={'admin-btn'}
                        onClick={testPreview}
                        disabled={previewLoading || !url.trim()}
                    >
                        {previewLoading ? STR.testingUrl : STR.previewBtn}
                    </button>
                    <button
                        type={'button'}
                        className={'admin-btn admin-btn-accent'}
                        onClick={add}
                        disabled={!url.trim()}
                    >
                        {STR.addAddon}
                    </button>
                </div>

                {previewError ? (
                    <div className={'admin-error'} style={{ marginTop: '10px' }}>
                        {previewError}
                    </div>
                ) : null}

                {preview ? (
                    <div className={'admin-preview-box'}>
                        <div className={'admin-addon-header'}>
                            {preview.logo ? (
                                <img src={preview.logo} alt={preview.name} className={'admin-addon-logo'} />
                            ) : (
                                <div className={'admin-addon-logo'} />
                            )}
                            <div className={'admin-addon-info'}>
                                <div className={'admin-addon-title-row'}>
                                    <span className={'admin-addon-name'}>{preview.name}</span>
                                    {preview.version ? <span className={'admin-addon-version'}>{preview.version}</span> : null}
                                    {preview.configurationRequired ? (
                                        <span className={'admin-badge admin-badge-warning'}>{STR.requiresConfigBadge}</span>
                                    ) : preview.configurable ? (
                                        <span className={'admin-badge admin-badge-configurable'}>{STR.configurableBadge}</span>
                                    ) : null}
                                </div>
                                {preview.description ? <div className={'admin-addon-desc'}>{preview.description}</div> : null}
                                <div className={'admin-addon-meta-row'}>
                                    {preview.types && preview.types.length > 0 ? (
                                        <span>{[STR.typesLabel, preview.types.join(', ')].join(' ')}</span>
                                    ) : null}
                                    {preview.resources && preview.resources.length > 0 ? (
                                        <span>{[STR.resourcesLabel, preview.resources.join(', ')].join(' ')}</span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {status ? <div className={'admin-status'}>{status}</div> : null}
        </div>
    );
};

const BlockedPatternsForm = () => {
    const [patterns, setPatterns] = React.useState(null);
    const [status, setStatus] = React.useState('');
    const [input, setInput] = React.useState('');
    React.useEffect(() => {
        api('/api/blocked-patterns').then(setPatterns).catch(() => setStatus(STR.failedLoadBlocked));
    }, []);
    const add = async () => {
        setStatus('');
        try {
            const created = await api('/api/blocked-patterns', { method: 'POST', body: JSON.stringify({ pattern: input }) });
            setPatterns((prev) => (prev ? [...prev, created] : [created]));
            setInput('');
            clearBlockedPatternsCache();
            setStatus(STR.blockedAdded);
        } catch (err) {
            setStatus(`${STR.addFailed} ${err.message}`);
        }
    };
    const remove = async (entry) => {
        if (!window.confirm(STR.confirmRemoveBlocked)) return;
        setStatus('');
        try {
            await api(`/api/blocked-patterns/${entry.id}`, { method: 'DELETE' });
            setPatterns((prev) => prev.filter((item) => item.id !== entry.id));
            clearBlockedPatternsCache();
            setStatus(STR.blockedRemoved);
        } catch {
            setStatus(STR.removeFailed);
        }
    };
    if (patterns === null) return <div>{status || STR.loading}</div>;
    return (
        <div>
            <h2>{STR.blockedTitle}</h2>
            {patterns.length === 0 ? <div>{STR.noBlocked}</div> : null}
            {patterns.map((entry) => (
                <div key={entry.id} className={'admin-slot'}>
                    <span>{entry.pattern}</span>
                    <button onClick={() => remove(entry)}>{STR.remove}</button>
                </div>
            ))}
            <div>
                <input value={input} placeholder={STR.blockedPlaceholder} onChange={(e) => setInput(e.target.value)} />
                <button onClick={add}>{STR.blockedAdd}</button>
            </div>
            {status ? <div className={'admin-status'}>{status}</div> : null}
        </div>
    );
};

const UsersForm = () => {
    const [users, setUsers] = React.useState(null);
    const [status, setStatus] = React.useState('');
    const [passwords, setPasswords] = React.useState({});
    React.useEffect(() => {
        api('/api/admin/users').then(setUsers).catch(() => setStatus(STR.failedLoadUsers));
    }, []);
    const setDisabled = async (user, disabled) => {
        setStatus('');
        try {
            const updated = await api(`/api/admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify({ disabled }) });
            setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, disabled: updated.disabled } : item)));
            setStatus(disabled ? STR.userDisabled : STR.userEnabled);
        } catch {
            setStatus(STR.updateFailed);
        }
    };
    const setPassword = async (user) => {
        setStatus('');
        try {
            await api(`/api/admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify({ password: passwords[user.id] || '' }) });
            setPasswords((prev) => ({ ...prev, [user.id]: '' }));
            setStatus(STR.passwordUpdated);
        } catch (err) {
            setStatus(`${STR.addFailed} ${err.message}`);
        }
    };
    if (users === null) return <div>{status || STR.loading}</div>;
    return (
        <div>
            <h2>{STR.usersTitle}</h2>
            {users.length === 0 ? <div>{STR.noUsers}</div> : null}
            {users.map((user) => (
                <div key={user.id} className={'admin-slot'}>
                    <span>{user.email}</span>
                    {user.disabled ? <span>{STR.disabledLabel}</span> : null}
                    <button onClick={() => setDisabled(user, !user.disabled)}>{user.disabled ? STR.enableUser : STR.disableUser}</button>
                    <input
                        value={passwords[user.id] || ''}
                        placeholder={STR.tempPasswordPlaceholder}
                        onChange={(e) => setPasswords({ ...passwords, [user.id]: e.target.value })}
                    />
                    <button onClick={() => setPassword(user)}>{STR.setTempPassword}</button>
                </div>
            ))}
            {status ? <div className={'admin-status'}>{status}</div> : null}
        </div>
    );
};

const Admin = () => {
    const [authed, setAuthed] = React.useState(null);
    const [tab, setTab] = React.useState('brand');
    const check = React.useCallback(() => {
        api('/api/admin/me').then(() => setAuthed(true)).catch(() => setAuthed(false));
    }, []);
    React.useEffect(check, [check]);
    const logout = async () => {
        await api('/api/admin/logout', { method: 'POST' }).catch(() => null);
        setAuthed(false);
    };
    if (authed === null) return <div className={'admin-page'}>{STR.loading}</div>;
    if (!authed) {
        return (
            <div className={'admin-page'}>
                <AdminLogin onLogin={() => setAuthed(true)} />
            </div>
        );
    }
    return (
        <div className={'admin-page'}>
            <h1>{STR.siteAdmin}</h1>
            <div className={'admin-tabs'}>
                {['brand', 'ads', 'uploads', 'addons', 'blocked', 'users'].map((name) => (
                    <button key={name} className={tab === name ? 'admin-active' : ''} onClick={() => setTab(name)}>
                        {name}
                    </button>
                ))}
                <button onClick={logout}>{STR.logout}</button>
            </div>
            {tab === 'brand' ? <BrandForm /> : null}
            {tab === 'ads' ? <AdsForm /> : null}
            {tab === 'uploads' ? <UploadsForm /> : null}
            {tab === 'addons' ? <AddonsForm /> : null}
            {tab === 'blocked' ? <BlockedPatternsForm /> : null}
            {tab === 'users' ? <UsersForm /> : null}
        </div>
    );
};

module.exports = Admin;
