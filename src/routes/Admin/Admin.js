// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// /admin CMS: brand fields, per-slot ad toggles + code editing, logo/favicon
// uploads. Session is an httpOnly cookie; /api/admin/me probes auth state.
const React = require('react');

const BRAND_FIELDS = ['site_name', 'tagline', 'logo_url', 'favicon_url', 'theme', 'accent'];

async function api(path, options = {}) {
    const response = await fetch(path, {
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
            <h2>Admin login</h2>
            <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete={'username'} /></label>
            <label>Password<input type={'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={'current-password'} /></label>
            {error ? <div className={'admin-error'}>{error}</div> : null}
            <button type={'submit'}>Log in</button>
        </form>
    );
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
            <h2>Brand</h2>
            {BRAND_FIELDS.map((field) => (
                <label key={field}>{field}
                    <input value={brand[field] || ''} onChange={(e) => setBrand({ ...brand, [field]: e.target.value })} />
                </label>
            ))}
            <button onClick={save}>Save brand</button>
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
            <h2>Ads</h2>
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
                        value={slot.code}
                        onChange={(e) =>
                            setSlots(slots.map((s) => (s.slot_key === slot.slot_key ? { ...s, code: e.target.value } : s)))
                        }
                    />
                    <button onClick={() => save(slot)}>Save {slot.slot_key}</button>
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
    };
    return (
        <div>
            <h2>Uploads</h2>
            <input type={'file'} accept={'.png,.jpg,.jpeg,.svg,.ico'} onChange={upload} />
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
    if (authed === null) return <div className={'admin-page'}>Loading…</div>;
    if (!authed) {
        return (
            <div className={'admin-page'}>
                <AdminLogin onLogin={() => setAuthed(true)} />
            </div>
        );
    }
    return (
        <div className={'admin-page'}>
            <h1>Site admin</h1>
            <div className={'admin-tabs'}>
                {['brand', 'ads', 'uploads'].map((name) => (
                    <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>
                        {name}
                    </button>
                ))}
                <button onClick={logout}>Log out</button>
            </div>
            {tab === 'brand' ? <BrandForm /> : null}
            {tab === 'ads' ? <AdsForm /> : null}
            {tab === 'uploads' ? <UploadsForm /> : null}
        </div>
    );
};

module.exports = Admin;
