/* eslint-disable no-console */

module.exports = function prepareRoute({ router, appEnv, log }) {
	const { isValidSlackBotToken, sendToSlack, debugLogger } = appEnv;

	router.post('/push-in', (req, res) => {
		debugLogger('Request (POST /push-in):', req.body);

		if (!isValidSlackBotToken(req.body.token)) {
			log.warn('Invalid token:', req.body.token);
			res.status(401).send();
			return;
		}

		if (!!req.body.text) {
			sendToSlack({ text: req.body.text });
			res.json({ ok: true });
		} else {
			res.json({ ok: false, error: 'Empty message body.' });
		}
	});
};
