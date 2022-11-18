const { logger, config, getLoggingLevel, appVersion, initInfluxDB, startDockerHealthcheckServer } = require('./lib/globals');

const moxa = require('./lib/moxa');
const serviceUptime = require('./lib/service_uptime');
const slack = require('./lib/slack');
const heartbeat = require('./lib/heartbeat');

logger.info('--------------------------------------');
logger.info('Starting garo-gnm3d-moxa');
logger.info(`Meter name           : ${config.get('EnergyMonitor.energyMeter.name')}`);
logger.info(`Meter id             : ${config.get('EnergyMonitor.energyMeter.id')}`);
logger.info(`Meter description    : ${config.get('EnergyMonitor.energyMeter.description')}`);
logger.info(`Meter phase count    : ${config.get('EnergyMonitor.energyMeter.phaseCount')}`);
logger.info(`InfluxDB measurement : ${config.get('EnergyMonitor.influxdbConfig.measurementName')}`);
logger.info(`Log level            : ${getLoggingLevel()}`);
logger.info(`App version          : ${appVersion}`);
logger.info(`Query frequency      : ${config.get('EnergyMonitor.moxa.queryInterval')}`);
logger.info('--------------------------------------');

if (config.get('EnergyMonitor.uptimeMonitor.enable') === true) {
    serviceUptime.serviceUptimeStart();
}

async function getStatusFromEnergyMonitor() {
    logger.verbose('Starting extraction of energy data...');

    try {
        await moxa.extractFromMoxa();

        logger.verbose('STATUS: Extraction run complete.');
    } catch (err) {
        slack.slackPostMessage(`❌ MAIN: Energy meter ${config.get('EnergyMonitor.energyMeter.name')}: "${err.errno}", "${err.message}"`);
        logger.error(`STATUS: ❌ Something went wrong: ${err}`);
    } finally {
        logger.debug('Finally...');
    }
}

function setupTimer() {
    // Configure timer for getting data from energy monitor
    setInterval(() => {
        getStatusFromEnergyMonitor();
    }, config.get('EnergyMonitor.moxa.queryInterval'));
}

(async () => {
    // Init InfluxDB
    initInfluxDB();

    // Say hello in Slack
    let slackMsg = '👋 Garo 3-phase energy monitor starting up - Greetings!\n';
    slackMsg += `\`\`\``;
    slackMsg += `> Meter name           : ${config.get('EnergyMonitor.energyMeter.name')}\n`;
    slackMsg += `> Meter id             : ${config.get('EnergyMonitor.energyMeter.id')}\n`;
    slackMsg += `> Meter description    : ${config.get('EnergyMonitor.energyMeter.description')}\n`;
    slackMsg += `> Meter phase count    : ${config.get('EnergyMonitor.energyMeter.phaseCount')}\n`;
    slackMsg += `> InfluxDB             : ${getLoggingLevel()}\n`;
    slackMsg += `> App version          : ${appVersion}\n`;
    slackMsg += `> Query frequency (ms) : ${config.get('EnergyMonitor.moxa.queryInterval')}`;
    slackMsg += `\`\`\``;
    slack.slackPostMessage(slackMsg);

    startDockerHealthcheckServer();

    // Set up heartbeats, if enabled in the config file
    if (config.has('EnergyMonitor.heartbeat.enable') && config.get('EnergyMonitor.heartbeat.enable') === true) {
        heartbeat.setupHeartbeatTimer(config, logger);
    }

    // Do initial query
    getStatusFromEnergyMonitor();

    // Call main function
    setupTimer();
})();
