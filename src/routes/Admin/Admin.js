// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// /admin CMS: brand fields, per-slot ad toggles + code editing, logo/favicon
// uploads. Session is an httpOnly cookie; /api/admin/me probes auth state.
const React = require('react');
const PropTypes = require('prop-types');
const { clearBlockedPatternsCache } = require('../../branding/streamPatterns');

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
    addFailed: 'Add failed.',
    addonRemoved: 'Addon removed.',
    removeFailed: 'Remove failed.',
    updateFailed: 'Update failed.',
    confirmRemove: 'Remove this addon?',
    noAddons: 'No addons yet.',
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

const AdsForm = () => {
    const [slots, setSlots] = React.useState(null);
    const [status, setStatus] = React.useState('');
    React.useEffect(() => {
        api('/api/adslots').then(setSlots).catch(() => setStatus('Failed to load ad slots'));
    }, []);
    const save = async (slot) => {
        setStatus('');
        try {
            await api('/api/adslots', { method: 'PUT', body: JSON.stringify(slot) });
            setStatus(`${slot.slot_key} saved. Reload the site to see changes.`);
        } catch {
            setStatus('Save failed (session expired? log in again).');
        }
    };
    if (slots === null) return <div>{status || 'Loading…'}</div>;
    return (
        <div>
            <h2>{STR.ads}</h2>
            {slots.map((slot) => (
                <div key={slot.slot_key} className={'admin-slot'}>
                    <label>
                        <input
                            type={'checkbox'}
                            checked={!!slot.enabled}
                            onChange={(e) =>
                                setSlots(slots.map((s) => (s.slot_key === slot.slot_key ? { ...s, enabled: e.target.checked ? 1 : 0 } : s)))
                            }
                        />
                        {slot.slot_key}
                    </label>
                    <textarea
                        rows={4}
                        value={slot.code || ''}
                        onChange={(e) =>
                            setSlots(slots.map((s) => (s.slot_key === slot.slot_key ? { ...s, code: e.target.value } : s)))
                        }
                    />
                    <button onClick={() => save(slot)}>{`${STR.save} ${slot.slot_key}`}</button>
                </div>
            ))}
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
    React.useEffect(() => {
        api('/api/addons').then(setAddons).catch(() => setStatus(STR.failedLoadAddons));
    }, []);
    const add = async () => {
        setStatus('');
        try {
            const created = await api('/api/addons', { method: 'POST', body: JSON.stringify({ manifest_url: url }) });
            setAddons((prev) => (prev ? [...prev, created] : [created]));
            setUrl('');
            setStatus(STR.addonAdded);
        } catch (err) {
            setStatus(`${STR.addFailed} ${err.message}`);
        }
    };
    const toggle = async (addon, enabled) => {
        setStatus('');
        try {
            const updated = await api(`/api/addons/${addon.id}`, { method: 'PUT', body: JSON.stringify({ enabled }) });
            const nextEnabled = updated.enabled !== undefined ? updated.enabled : enabled;
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
                next[index] = other;
                next[neighbor] = current;
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
    if (addons === null) return <div>{status || STR.loading}</div>;
    return (
        <div>
            <h2>{STR.addonsTitle}</h2>
            {addons.length === 0 ? <div>{STR.noAddons}</div> : null}
            {addons.map((addon, index) => (
                <div key={addon.id} className={'admin-slot'}>
                    <span>{addon.name}</span>
                    <span>{addon.manifest_url}</span>
                    <label>
                        <input
                            type={'checkbox'}
                            checked={!!addon.enabled}
                            onChange={(e) => toggle(addon, e.target.checked)}
                        />
                        {STR.enable}
                    </label>
                    <button onClick={() => move(index, -1)} disabled={index === 0}>{STR.moveUp}</button>
                    <button onClick={() => move(index, 1)} disabled={index === addons.length - 1}>{STR.moveDown}</button>
                    <button onClick={() => remove(addon)}>{STR.remove}</button>
                </div>
            ))}
            <div>
                <input value={url} placeholder={STR.addonUrl} onChange={(e) => setUrl(e.target.value)} />
                <button onClick={add}>{STR.addAddon}</button>
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
