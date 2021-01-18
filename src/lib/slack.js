'use strict';

const globals = require('./globals');
var slack = require('node-slack');

// Slack config
var slackWebhookURL = globals.config.get('EnergyMonitor.slack.webhookURL');
var slackChannel = globals.config.get('EnergyMonitor.slack.channel');

// Create Slack object
var slackObj = new slack(slackWebhookURL);

function slackPostMessage(message) {
    try {
        if (message.length == 0) {
            // Required parameter is missing
            globals.error('No message passed to send-to-Slack function');
        } else {
            slackObj.send({
                text: message,
                channel: slackChannel,
                username: 'energy-monitor-bot',
                // icon_emoji: ,
            });
        }
    } catch (err) {
        globals.logger.error(`SLACK: Failed sending Slack message: "${message}"`);
    }
}

module.exports = {
    slackPostMessage,
};
