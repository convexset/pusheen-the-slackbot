const superb = require('superb');

module.exports = function compliment({ userName, subCommandDetails }, { respondNowInChannel, respondNowEphemeral }) {
	return new Promise(resolve => {
		let respondFn = respondNowInChannel;
		const payload = {
			text: `<@${userName}> is ${superb()}!`,
		};

		if (subCommandDetails.toLowerCase().trim() === 'private') {
			respondFn = respondNowEphemeral;
		}
		if (subCommandDetails.toLowerCase().trim() === 'tell all') {
			payload.text = `Hey <!channel>, ${payload.text}`;
		}

		respondFn(payload);
		resolve();
	});
};

module.exports.description = '`compliment`: get what you deserve (variants: `/demand compliment private` to just keep it between us; `/demand compliment tell all` to do just that)';
