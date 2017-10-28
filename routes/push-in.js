/* eslint-disable no-console */

const ENDPOINT_TYPE = 'POST';
const ENDPOINT = '/push-in';

module.exports = function prepareRoute({ router, appEnv, log }) {
	const { isValidSlackBotToken, sendToSlack, debugLogger } = appEnv;

	debugLogger(`Registering end point: ${ENDPOINT_TYPE} ${ENDPOINT}`);
	router[ENDPOINT_TYPE.toLowerCase()](ENDPOINT, (req, res) => {
		if (!isValidSlackBotToken(req.body.token)) {
			log.warn(`Invalid bot token (${ENDPOINT_TYPE} ${ENDPOINT}):`, req.body.token);
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
