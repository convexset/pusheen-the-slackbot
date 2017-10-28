const _ = require('underscore');

const subCommands = [
	'health-check',
	'list-cards',
	'get-card',
];

module.exports = _.object(subCommands.map(k => [k, require(`./${k}`)]));
