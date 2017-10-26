/* eslint-disable no-console */

module.exports = function prepareRoute({ router, appEnv }) {
	const { debugLogger } = appEnv;

	router.post('/challenge', (req, res) => {
		debugLogger('Request (POST /challenge):', req.body);
		res.send(req.body.challenge || '', { 'Content-Type': 'text/plain' }, 200);
	});

	router.post('/slack-action-endpoint', (req, res) => {
		debugLogger('Request (POST /slack-action-endpoint):', req.body);
		res.json({ msg: 'pending implementation' });
	});

	router.post('/slack-action-endpoint', (req, res) => {
		debugLogger('Request (POST /slack-action-endpoint):', req.body);
		res.json({ msg: 'pending implementation' });
	});
};
