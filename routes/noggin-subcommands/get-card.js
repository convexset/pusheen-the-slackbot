const _ = require('underscore');
// const superb = require('superb');
const axios = require('axios');

module.exports = function getCard({ subCommandDetails }, { respondNow, respondLater, debugLogger, debugErrorLogger, nogginEnv }) {
	return new Promise(resolve => {
		const params = subCommandDetails.toLowerCase().trim().split(' ').filter(x => !!x);
		const cfgName = params.shift();
		const cardId = params.shift();
		if (nogginEnv.hasOwnProperty(cfgName)) {
			if (!!nogginEnv[cfgName].auth) {
				respondNow({
					text: `Getting card from \`${cfgName}\` with id \`${cardId}\`...`,
				});

				const { marketServicesUrl } = nogginEnv[cfgName];

				axios.get(`${marketServicesUrl}/card/${cardId}`, { headers: { 'X-Auth-Token': nogginEnv[cfgName].auth.token } })
					.then(r => {
						const card = r.data;
						const { caption, description, seller: { id: sellerId, name: sellerName }, launchedDate, expectedEndDate, actualEndDate, imageUrl, targetProfile: _targetProfile } = card;
						let sellerUrl = nogginEnv[cfgName].sellerCache && nogginEnv[cfgName].sellerCache[sellerId] && nogginEnv[cfgName].sellerCache[sellerId].website || '';
						// eslint-disable-next-line
						const targetProfile = _.isArray(_targetProfile) ? _targetProfile : (!!_targetProfile ? [_targetProfile] : []);
						debugLogger(`[get-card|${cfgName}] ${r.request.res.statusCode} ${r.request.res.statusMessage}:`, card);
						// https://api.slack.com/docs/messages/builder
						// https://api.slack.com/slash-commands#responding_to_a_command

						respondLater({
							text: `*${caption}*\nby ${!!sellerUrl ? `<${sellerUrl}|${sellerName}>` : sellerName}\n\n_${description || ''}_`,
							attachments: [{
								fields: [{
									title: 'Launch Date',
									value: `${(new Date(launchedDate)).toDateString()}`,
									short: true
								},
								// {
								// 	title: 'Exp. End Date',
								// 	value: `${(new Date(expectedEndDate)).toDateString()}`,
								// 	short: true
								// },
								{
									title: 'Actual End Date',
									value: `${(new Date(actualEndDate)).toDateString()}`,
									short: true
								}]
							},
							{
								pretext: `Image: ${caption}`,
								fallback: `Image: ${caption}`,
								image_url: imageUrl
							},
							{
								text: `Target Profile: ${(targetProfile || []).map(({name}) => name).join(', ') || '-'}`,
								footer: 'Noggin GTM',
								ts: launchedDate
							}]
						});
						resolve();
					})
					.catch(r => {
						debugErrorLogger(`[get-card|failure|${cfgName}] ${r.request.res.statusCode} ${r.request.res.statusMessage}:\n`, r.request._header);
						respondLater({
							text: `Card listing for \`${cfgName}\` ⟶ *FAILURE*: \`${r.request.res.statusCode} ${r.request.res.statusMessage}\` (${r.data})`
						});
					});
			} else {
				respondNow({
					text: `No authentication token for \`${cfgName}\` yet. Try again in 10 seconds.`,
				});
				resolve();
			}
		} else {
			respondNow({
				text: `No such deployment: \`${cfgName}\` (available: ${Object.keys(nogginEnv).map(x => `\`${x}\``).join(', ')})`,
			});
			resolve();
		}
	});
};

module.exports.description = '`get-card [deployment] [card-id]`: retrieve card with id `[card-id]` for `[deployment]`';