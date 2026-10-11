// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, it */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { sendMail } = require('../smtp');

function fakeSmtpServer(ehloLines) {
    let received = null;
    const clientLines = [];
    const server = net.createServer((socket) => {
        socket.write('220 fake ESMTP\r\n');
        let dataMode = false;
        let buf = '';
        const got = [];
        socket.on('data', (chunk) => {
            buf += chunk.toString('utf8');
            let idx;
            while ((idx = buf.indexOf('\r\n')) !== -1) {
                const line = buf.slice(0, idx);
                buf = buf.slice(idx + 2);
                clientLines.push(line);
                if (dataMode) {
                    got.push(line);
                    if (line === '.') { dataMode = false; received = got.join('\n'); socket.write('250 queued\r\n'); }
                    continue;
                }
                const verb = line.split(' ')[0].toUpperCase();
                if (verb === 'EHLO') socket.write((ehloLines || ['250-fake', '250 AUTH LOGIN']).join('\r\n') + '\r\n');
                // NB: DATA/QUIT before AUTH — bare verbs also match the base64
                // heuristic below, which would otherwise shadow these branches.
                else if (verb === 'DATA') { dataMode = true; socket.write('354 go\r\n'); }
                else if (verb === 'QUIT') { socket.write('221 bye\r\n'); socket.end(); }
                else if (verb === 'AUTH' && line.startsWith('AUTH PLAIN ')) socket.write('235 ok\r\n');
                else if (verb === 'AUTH' || /^[A-Za-z0-9+/=]+$/.test(line)) socket.write('334 next\r\n');
                else if (verb === 'MAIL' || verb === 'RCPT') socket.write('250 ok\r\n');
                else socket.write('250 ok\r\n');
            }
        });
    });
    return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
        server,
        port: server.address().port,
        mail: () => received,
        clientLines: () => clientLines,
        close: () => new Promise((r) => server.close(r)),
    })));
}

describe('smtp client', () => {
    it('delivers through EHLO/AUTH/DATA/QUIT', async () => {
        const fake = await fakeSmtpServer();
        process.env.SMTP_HOST = '127.0.0.1';
        process.env.SMTP_PORT = String(fake.port);
        process.env.SMTP_USER = 'u';
        process.env.SMTP_PASS = 'p';
        process.env.SMTP_FROM = 'no-reply@example.com';
        await sendMail({ to: 'ann@example.com', subject: 'Code', text: '123456' });
        delete process.env.SMTP_HOST;
        const received = fake.mail();
        assert.match(received, /Subject: Code/);
        assert.match(received, /123456/);
        assert.match(received, /To: ann@example\.com/);
        await fake.close();
    });
    it('uses AUTH PLAIN when the server offers only PLAIN', async () => {
        const fake = await fakeSmtpServer(['250-fake', '250 AUTH PLAIN']);
        process.env.SMTP_HOST = '127.0.0.1';
        process.env.SMTP_PORT = String(fake.port);
        process.env.SMTP_USER = 'u';
        process.env.SMTP_PASS = 'p';
        process.env.SMTP_FROM = 'no-reply@example.com';
        await sendMail({ to: 'ann@example.com', subject: 'Code', text: '123456' });
        delete process.env.SMTP_HOST;
        assert.ok(fake.clientLines().some((l) => l.startsWith('AUTH PLAIN ')));
        assert.ok(!fake.clientLines().some((l) => l === 'AUTH LOGIN'));
        assert.match(fake.mail(), /123456/);
        await fake.close();
    });
});
