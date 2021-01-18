const globals = require('./globals');
const axios = require('axios');

var callRemoteURL = function (remoteURL) {
    axios
        .get(remoteURL)
        .then(function (response) {
            // handle success
            globals.logger.debug(`HEARTBEAT: Sent heartbeat to ${remoteURL}`);
        })
        .catch(function (error) {
            // handle error
            globals.logger.error(`HEARTBEAT: Error sending heartbeat: ${error}`);
        });
};

function setupHeartbeatTimer(config, logger) {
    try {
        logger.debug(
            `HEARTBEAT: Setting up heartbeat to remote: ${config.get('EnergyMonitor.heartbeat.remoteURL')}`,
        );

        var t = setInterval(function () {
            callRemoteURL(config.get('EnergyMonitor.heartbeat.remoteURL'));
        }, config.get('EnergyMonitor.heartbeat.frequency'));

        // Do an initial ping to the remote URL
        callRemoteURL(config.get('EnergyMonitor.heartbeat.remoteURL'));
    } catch (err) {
        logger.error(`HEARTBEAT: Error ${err}`);
    }
}

module.exports = {
    setupHeartbeatTimer,
};
