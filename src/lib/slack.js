const Slack = require('node-slack');

const globals = require('./globals');

// Slack config
const slackWebhookURL = globals.config.get('EnergyMonitor.slack.webhookURL');
const slackChannel = globals.config.get('EnergyMonitor.slack.channel');

// Create Slack object
const slackObj = new Slack(slackWebhookURL);

function slackPostMessage(message) {
    try {
        if (message.length === 0) {
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
