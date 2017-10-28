const _ = require('underscore');

const ENDPOINT_TYPE = 'POST';
const ENDPOINT = '/shutdown';

module.exports = function prepareRoute({ router, appEnv, log, allServers }) {
	const { isValidSlackBotToken, sendToSlack, debugLogger } = appEnv;

	debugLogger('Registering end point: POST /shutdown');
	router.post('/shutdown', (req, res) => {
		if (!isValidSlackBotToken(req.body.token)) {
			log.warn(`Invalid bot token (${ENDPOINT_TYPE} ${ENDPOINT}):`, req.body.token);
			res.status(401).send();
			return;
		}

		sendToSlack({ text: '*Bot shutting down...*' });

		sendToSlack({ text: '> _Strike me down and I will become more powerful than you could possibly imagine._\n> — Obi Wan Kat\'nobi 👻' });

		log.info('Shutting down...');

		/* eslint-disable no-console */
		console.log('');
		console.log('--------------------------------------------------');
		console.log('--------------------------------------------------');
		console.log('');
		/* eslint-enable no-console */

		setTimeout(() => {
			allServers.forEach(server => server.close());
		}, 0);
		_.forEach(appEnv.timersInterval || {}, timer => {
			clearInterval(timer);
		});
		_.forEach(appEnv.timersTimeout || {}, timer => {
			clearTimeout(timer);
		});
		setTimeout(() => {
			// eslint-disable-next-line no-process-exit
			process.exit(255);
		}, 500);
		res.json({ ok: true });
	});
};
