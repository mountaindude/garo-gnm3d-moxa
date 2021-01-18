/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

const process = require('process');
var moment = require('moment');
require('moment-precise-range-plugin');
const globals = require('./globals');
const postToInfluxdb = require('./post-to-influxdb');

function serviceUptimeStart() {
    function logUptime() {
        startIterations++;
        let uptimeMilliSec = process.uptime() * 1000;
        moment.duration(uptimeMilliSec);

        let heapTotal = Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
            heapUsed = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
            processMemory = Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100,
            external = Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100;

        globals.logger.log(uptimeLogLevel, '--------------------------------');
        globals.logger.log(
            uptimeLogLevel,
            'Iteration # ' +
                formatter.format(startIterations) +
                ', Uptime: ' +
                moment.preciseDiff(0, uptimeMilliSec) +
                `, Heap used ${heapUsed} MB of total heap ${heapTotal} MB. External (off-heap): ${external} MB. Memory allocated to process: ${processMemory} MB.`,
        );

        // Store to Influxdb
        if (globals.config.get('EnergyMonitor.uptimeMonitor.storeInInfluxdb.enable') == true) {
            let influxTags = {};
            if (globals.config.has('EnergyMonitor.uptimeMonitor.storeInInfluxdb.instanceTag')) {
                influxTags = {
                    instance_tag: globals.config.get('EnergyMonitor.uptimeMonitor.storeInInfluxdb.instanceTag'),
                };
            }

            postToInfluxdb.postMemoryUsageToInfluxdb(
                {
                    // instanceTag: camonitorMemoryInfluxTag,
                    heapUsed: heapUsed,
                    heapTotal: heapTotal,
                    external: external,
                    processMemory: processMemory,
                },
                influxTags,
            );
        }
    }

    let uptimeLogLevel = globals.config.get('EnergyMonitor.uptimeMonitor.logLevel'),
        uptimeInterval = globals.config.get('EnergyMonitor.uptimeMonitor.frequency');

    // Formatter for numbers
    const formatter = new Intl.NumberFormat('en-US');

    // Log uptime to console
    Number.prototype.toTime = function (isSec) {
        let ms = isSec ? this * 1e3 : this,
            lm = ~(4 * !!isSec),
            /* limit fraction */
            fmt = new Date(ms).toISOString().slice(11, lm);

        if (ms >= 8.64e7) {
            /* >= 24 hours */
            let parts = fmt.split(/:(?=\d{2}:)/);
            parts[0] -= -24 * ((ms / 8.64e7) | 0);
            return parts.join(':');
        }

        return fmt;
    };

    let startIterations = 0;

    setInterval(function () {
        logUptime();
    }, uptimeInterval);
}

module.exports = {
    serviceUptimeStart,
};
