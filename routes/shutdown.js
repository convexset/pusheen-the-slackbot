/* eslint-disable no-console */

module.exports = function prepareRoute({ router, appEnv, log, allServers }) {
	const { isValidSlackBotToken, sendToSlack } = appEnv;

	router.post('/shutdown', (req, res) => {
		if (!isValidSlackBotToken(req.body.token)) {
			log.warn('Invalid token:', req.body.token);
			res.status(401).send();
			return;
		}

		sendToSlack({ text: '*Bot shutting down...*' });

		sendToSlack({ text: '> _Strike me down and I will become more powerful than you could possibly imagine._\n> — Obi Wan Kat\'nobi 👻' });

		log.info('Shutting down...');
		console.log('--------------------------------------------------');
		setTimeout(() => {
			allServers.forEach(server => server.close());
		}, 0);
		res.json({ ok: true });
	});
};
