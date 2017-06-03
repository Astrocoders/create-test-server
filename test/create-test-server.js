import test from 'ava';
import got from 'got';
import createTestServer from '../';

test('createTestServer is a function', t => {
	t.is(typeof createTestServer, 'function');
});

test('createTestServer returns a Promise', t => {
	t.true(createTestServer() instanceof Promise);
});

test('server instance exposes useful properties', async t => {
	const server = await createTestServer();

	t.is(server.host, 'localhost');
	t.true(typeof server.port === 'number');
	t.true(typeof server.sslPort === 'number');
	t.is(server.url, `http://${server.host}:${server.port}`);
	t.is(server.sslUrl, `https://${server.host}:${server.sslPort}`);
	t.true(typeof server.sslCert === 'object');
	t.true(typeof server.listen === 'function');
	t.true(typeof server.close === 'function');
});

test('express endpoint', async t => {
	const server = await createTestServer();

	server.get('/foo', (req, res) => {
		res.send('bar');
	});

	const { body } = await got(server.url + '/foo');
	t.is(body, 'bar');
});

test('server can be stopped and restarted', async t => {
	const server = await createTestServer();

	server.get('/foo', (req, res) => {
		res.send('bar');
	});

	t.plan(3);

	const { body } = await got(server.url + '/foo');
	t.is(body, 'bar');

	await server.close();

	await got(server.url + '/foo', { timeout: 100 }).catch(err => {
		t.is(err.code, 'ETIMEDOUT');
	});

	await server.listen();

	const { body: bodyRestarted } = await got(server.url + '/foo');
	t.is(bodyRestarted, 'bar');
});

test('server listens for SSL traffic', async t => {
	const server = await createTestServer();

	server.get('/foo', (req, res) => {
		res.send('bar');
	});

	const { body } = await got(server.sslUrl + '/foo', { rejectUnauthorized: false });
	t.is(body, 'bar');
});

test('opts.certificate is passed through to createCert()', async t => {
	const server = await createTestServer({ certificate: 'foo.bar' });

	server.get('/foo', (req, res) => {
		res.send('bar');
	});

	const { body } = await got(server.sslUrl + '/foo', {
		strictSSL: true,
		ca: server.sslCert.caKeys.cert,
		headers: { host: 'foo.bar' }
	});
	t.is(body, 'bar');
});
