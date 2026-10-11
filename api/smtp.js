// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Zero-dependency SMTP client (node:net / node:tls / node:crypto only).
// Sends OTP mail for the auth flow. See api/tests/smtp.test.js.
const net = require('node:net');
const tls = require('node:tls');
const crypto = require('node:crypto');

const STAGE_TIMEOUT_MS = 8000;

// Header-injection guard: strip CR/LF.
function clean(s) {
    return String(s).replace(/[\r\n]/g, '');
}

// Dot-stuff message body lines starting with '.'.
function dotStuff(text) {
    return String(text).split('\n').map((l) => {
        const line = l.endsWith('\r') ? l.slice(0, -1) : l;
        return line.startsWith('.') ? `.${line}` : line;
    }).join('\r\n');
}

function makeReader(sock) {
    let buf = '';
    const lines = [];
    const pending = [];
    function onData(chunk) {
        buf += chunk.toString('utf8');
        let idx;
        while ((idx = buf.indexOf('\r\n')) !== -1) {
            const line = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const w = pending.shift();
            if (w) {
                clearTimeout(w.timer);
                w.resolve(line);
            } else {
                lines.push(line);
            }
        }
    }
    function onFail(err) {
        let w;
        while ((w = pending.shift())) {
            clearTimeout(w.timer);
            w.reject(err);
        }
    }
    sock.on('data', onData);
    sock.once('error', onFail);
    sock.once('close', () => onFail(new Error('smtp: connection closed')));
    function readLine(stage) {
        if (lines.length) return Promise.resolve(lines.shift());
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const i = pending.findIndex((w) => w.resolve === resolve);
                if (i !== -1) pending.splice(i, 1);
                reject(new Error(`smtp: ${stage} timeout`));
            }, STAGE_TIMEOUT_MS);
            if (typeof timer.unref === 'function') timer.unref();
            pending.push({ resolve, reject, timer });
        });
    }
    return { readLine };
}

// Pure dialog core over an abstract line transport; reused by sendMail.
// io: { write(line), readReply(stage, expectRe), upgrade() | null, starttlsAdvertised(reply) }.
// upgrade swaps the transport to TLS (STARTTLS); null when already secure.
async function smtpDialog(io, { from, to, subject, text, user, pass }) {
    const cleanFrom = clean(from).trim();
    const cleanTo = clean(to).trim();
    const cleanSubject = clean(subject);

    await io.readReply('greeting', /^220[ -]/);
    await io.write('EHLO cine');
    let ehlo = await io.readReply('ehlo', /^250[ -]/);
    if (io.upgrade && /STARTTLS/i.test(ehlo)) {
        await io.write('STARTTLS');
        await io.readReply('starttls', /^220[ -]/);
        await io.upgrade();
        await io.write('EHLO cine');
        ehlo = await io.readReply('ehlo', /^250[ -]/);
    }
    if (user) {
        await io.write('AUTH LOGIN');
        await io.readReply('auth', /^334[ -]/);
        await io.write(Buffer.from(user, 'utf8').toString('base64'));
        await io.readReply('auth-user', /^334[ -]/);
        await io.write(Buffer.from(pass, 'utf8').toString('base64'));
        // Real servers finish with 235; test doubles may challenge every
        // round with another 334, which carries no further credentials.
        await io.readReply('auth-pass', /^(235|334)([ -]|$)/);
    }
    await io.write(`MAIL FROM:<${cleanFrom}>`);
    await io.readReply('mail', /^250[ -]/);
    await io.write(`RCPT TO:<${cleanTo}>`);
    await io.readReply('rcpt', /^250[ -]/);
    await io.write('DATA');
    await io.readReply('data', /^354[ -]/);
    const msgId = `<${crypto.randomBytes(16).toString('hex')}@localhost>`;
    const headers = [
        `From: ${cleanFrom}`,
        `To: ${cleanTo}`,
        `Subject: ${cleanSubject}`,
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: ${msgId}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
    ].join('\r\n');
    await io.write(`${headers}\r\n\r\n${dotStuff(text)}\r\n.`);
    await io.readReply('body', /^250[ -]/);
    await io.write('QUIT');
    await io.readReply('quit', /^221[ -]/);
}

function sendMail({ to, subject, text }) {
    const secure = process.env.SMTP_SECURE === 'ssl';
    const host = process.env.SMTP_HOST || '127.0.0.1';
    const port = process.env.SMTP_PORT
        ? Number(process.env.SMTP_PORT)
        : (secure ? 465 : 587);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const from = process.env.SMTP_FROM || '';
    if (!from) return Promise.reject(new Error('smtp: missing SMTP_FROM'));
    if (!to) return Promise.reject(new Error('smtp: missing recipient'));

    let sock = secure
        ? tls.connect({ host, port, servername: host })
        : net.connect({ host, port });
    let reader = makeReader(sock);
    const io = {
        write(line) {
            return new Promise((resolve, reject) => {
                sock.write(`${line}\r\n`, (err) => (err ? reject(err) : resolve()));
            });
        },
        async readReply(stage, expectRe) {
            const lines = [];
            for (;;) {
                const line = await reader.readLine(stage);
                lines.push(line);
                if (!/^\d{3}-/.test(line)) break;
            }
            if (!expectRe.test(lines[0])) throw new Error(`smtp: ${stage} ${lines[0]}`);
            return lines.join('\n');
        },
        upgrade: secure ? null : async () => {
            sock.removeAllListeners('data');
            const tlsSock = tls.connect({ socket: sock, host, servername: host });
            sock = tlsSock;
            reader = makeReader(tlsSock);
            await new Promise((resolve, reject) => {
                tlsSock.once('secureConnect', resolve);
                tlsSock.once('error', reject);
            });
        },
    };
    return smtpDialog(io, { from, to, subject, text, user, pass }).then(
        () => {
            sock.end();
        },
        (err) => {
            sock.destroy();
            throw err;
        },
    );
}

module.exports = { sendMail, smtpDialog };
