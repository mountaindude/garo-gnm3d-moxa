const later = require('@breejs/later');
const axios = require('axios');

const callRemoteURL = (remoteURL, logger) => {
    axios
        .get(remoteURL)
        // eslint-disable-next-line no-unused-vars
        .then((response) => {
            // handle success
            logger.debug(`HEARTBEAT: Sent heartbeat to ${remoteURL}`);
        })
        .catch((error) => {
            // handle error
            logger.error(`HEARTBEAT: Error sending heartbeat: ${error}`);
        });
};

function setupHeartbeatTimer(config, logger) {
    try {
        logger.debug(`HEARTBEAT: Setting up heartbeat to remote: ${config.get('EnergyMonitor.heartbeat.remoteURL')}`);

        const sched = later.parse.text(config.get('EnergyMonitor.heartbeat.frequency'));
        later.setInterval(() => {
            callRemoteURL(config.get('EnergyMonitor.heartbeat.remoteURL'), logger);
        }, sched);

        // Do an initial ping to the remote URL
        callRemoteURL(config.get('EnergyMonitor.heartbeat.remoteURL'), logger);
    } catch (err) {
        logger.error(`HEARTBEAT: ${err}`);
    }
}

module.exports = {
    setupHeartbeatTimer,
};
