/* eslint-disable no-console */

const ENDPOINT_TYPE = 'POST';
const ENDPOINT = '/challenge';

module.exports = function prepareRoute({ router, appEnv }) {
	const { debugLogger } = appEnv;

	debugLogger(`Registering end point: ${ENDPOINT_TYPE} ${ENDPOINT}`);
	router[ENDPOINT_TYPE.toLowerCase()](ENDPOINT, (req, res) => {
		debugLogger('Request (POST /challenge):', req.body);
		res.send(req.body.challenge || '', { 'Content-Type': 'text/plain' }, 200);
	});

	// debugLogger('Registering end point: POST /slack-action-endpoint');
	// router.post('/slack-action-endpoint', (req, res) => {
	// 	debugLogger('Request (POST /slack-action-endpoint):', req.body);
	// 	res.json({ msg: 'pending implementation' });
	// });

	// debugLogger('Registering end point: POST /slack-action-endpoint');
	// router.post('/slack-action-endpoint', (req, res) => {
	// 	debugLogger('Request (POST /slack-action-endpoint):', req.body);
	// 	res.json({ msg: 'pending implementation' });
	// });
};
