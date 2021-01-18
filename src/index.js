'use strict';

const globals = require('./lib/globals');
const moxa = require('./lib/moxa');
const serviceUptime = require('./lib/service_uptime');
const slack = require('./lib/slack');

globals.logger.info('--------------------------------------');
globals.logger.info('Starting garo-gnm3d-moxa');
globals.logger.info(`Meter name           : ${globals.config.get('EnergyMonitor.energyMeter.name')}`);
globals.logger.info(`Meter id             : ${globals.config.get('EnergyMonitor.energyMeter.id')}`);
globals.logger.info(`Meter description    : ${globals.config.get('EnergyMonitor.energyMeter.description')}`);
globals.logger.info(`Meter phase count    : ${globals.config.get('EnergyMonitor.energyMeter.phaseCount')}`);
globals.logger.info(`InfluxDB measurement : ${globals.config.get('EnergyMonitor.influxdbConfig.measurementName')}`);
globals.logger.info(`Log level is         : ${globals.getLoggingLevel()}`);
globals.logger.info(`App version is       : ${globals.appVersion}`);
globals.logger.info(`Query frequency      : ${globals.config.get('EnergyMonitor.moxa.queryInterval')}`);
globals.logger.info('--------------------------------------');

if (globals.config.get('EnergyMonitor.uptimeMonitor.enable') == true) {
    serviceUptime.serviceUptimeStart();
}

function setupTimer() {
    // Configure timer for getting data from energy monitor
    setInterval(function () {
        getStatusFromEnergyMonitor();
    }, globals.config.get('EnergyMonitor.moxa.queryInterval'));
}

function getStatusFromEnergyMonitor() {
    globals.logger.verbose('Starting extraction of energy data...');

    try {
        moxa.extractFromMoxa();

        globals.logger.verbose('STATUS: Extraction run complete.');
    } catch (err) {
        slack.slackPostMessage(`❌ Energy meter ${globals.config.get('EnergyMonitor.energyMeter.name')}: ${err}`);
        globals.logger.error(`STATUS: ❌ Something went wrong: ${err}`);
    } finally {
        globals.logger.debug('Finally...');
    }
}

(async () => {
    // Init InfluxDB
    globals.initInfluxDB();

    // Say hello in Slack
    slack.slackPostMessage('👋 Garo 3-phase energy monitor starting up - Greetings!');

    // Do initial query
    getStatusFromEnergyMonitor();

    // Call main function
    setupTimer();
})();
