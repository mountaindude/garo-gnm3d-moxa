'use strict';

const globals = require('./globals');
const postToInfluxdb = require('./post-to-influxdb');
const slack = require('./slack');

// create an empty modbus client
var ModbusRTU = require('modbus-serial');
var client = new ModbusRTU();

async function extractFromMoxa() {
    try {
        let influxTags = {
            monitor_name: globals.config.get('EnergyMonitor.energyMeter.name'),
            monitor_id: globals.config.get('EnergyMonitor.energyMeter.id'),
            phases: globals.config.get('EnergyMonitor.energyMeter.phaseCount'),
        };

        let currStatus = {};
        // Open connection to a Moxa ASCII tcp endpoint
        await client.connectTelnet(globals.config.get('EnergyMonitor.moxa.host'), { port: globals.config.get('EnergyMonitor.moxa.port') });
        await client.setID(globals.config.get('EnergyMonitor.moxa.deviceId'));
        await client.setTimeout(1500);

        // System variables
        let data = await client.readInputRegisters(0x102, 20);

        currStatus.v_ln_sys = (data.buffer.readInt16BE(0) + data.buffer.readInt16BE(6) * 0x10000) / 10;
        currStatus.v_ll_sys = (data.buffer.readInt16BE(4) + data.buffer.readInt16BE(6) * 0x10000) / 10;
        currStatus.w_sys = (data.buffer.readInt16BE(8) + data.buffer.readInt16BE(14) * 0x10000) / 10;
        currStatus.va_sys = (data.buffer.readInt16BE(12) + data.buffer.readInt16BE(18) * 0x10000) / 10;
        currStatus.var_sys = (data.buffer.readInt16BE(16) + data.buffer.readInt16BE(22) * 0x10000) / 10;
        currStatus.pf_sys = (data.buffer.readInt16BE(20) + data.buffer.readInt16BE(26) * 0x10000) / 1000;
        currStatus.phase_seq_sys = (data.buffer.readInt16BE(24) + data.buffer.readInt16BE(26) * 0x10000);
        currStatus.hz = (data.buffer.readInt16BE(28) + data.buffer.readInt16BE(34) * 0x10000) / 10;

        // Total energies and dmd power
        data = await client.readInputRegisters(0x112, 12);

        currStatus.kwh_pos_tot = (data.buffer.readInt16BE(0) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.kvarh_pos_tot = (data.buffer.readInt16BE(4) + data.buffer.readInt16BE(6) * 0x10000) / 10;
        currStatus.kwh_neg_tot = (data.buffer.readInt16BE(8) + data.buffer.readInt16BE(10) * 0x10000) / 10;
        currStatus.kvarh_neg_tot = (data.buffer.readInt16BE(12) + data.buffer.readInt16BE(14) * 0x10000) / 10;
        currStatus.kw_dmd = (data.buffer.readInt16BE(16) + data.buffer.readInt16BE(18) * 0x10000) / 10;
        currStatus.kw_dmd_peak = (data.buffer.readInt16BE(20) + data.buffer.readInt16BE(22) * 0x10000) / 10;

        // Phase 1 (L1) variables
        data = await client.readInputRegisters(0x11e, 14);

        currStatus.l1_v_l1_l2 = (data.buffer.readInt16BE(0) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l1_v_l1_n = (data.buffer.readInt16BE(4) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l1_a = (data.buffer.readInt16BE(8) + data.buffer.readInt16BE(2) * 0x10000) / 1000;
        currStatus.l1_w = (data.buffer.readInt16BE(12) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l1_va = (data.buffer.readInt16BE(16) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l1_var = (data.buffer.readInt16BE(20) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l1_pf = (data.buffer.readInt16BE(24) + data.buffer.readInt16BE(2) * 0x10000) / 1000;

        // Phase 2 (L2) variables
        data = await client.readInputRegisters(0x12c, 14);

        currStatus.l2_v_l2_l3 = (data.buffer.readInt16BE(0) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l2_v_l2_n = (data.buffer.readInt16BE(4) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l2_a = (data.buffer.readInt16BE(8) + data.buffer.readInt16BE(2) * 0x10000) / 1000;
        currStatus.l2_w = (data.buffer.readInt16BE(12) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l2_va = (data.buffer.readInt16BE(16) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l2_var = (data.buffer.readInt16BE(20) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l2_pf = (data.buffer.readInt16BE(24) + data.buffer.readInt16BE(2) * 0x10000) / 1000;

        // Phase 3 (L3) variables
        data = await client.readInputRegisters(0x13a, 14);

        currStatus.l3_v_l2_l3 = (data.buffer.readInt16BE(0) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l3_v_l2_n = (data.buffer.readInt16BE(4) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l3_a = (data.buffer.readInt16BE(8) + data.buffer.readInt16BE(2) * 0x10000) / 1000;
        currStatus.l3_w = (data.buffer.readInt16BE(12) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l3_va = (data.buffer.readInt16BE(16) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l3_var = (data.buffer.readInt16BE(20) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.l3_pf = (data.buffer.readInt16BE(24) + data.buffer.readInt16BE(2) * 0x10000) / 1000;

        // Other energies
        data = await client.readInputRegisters(0x148, 14);

        currStatus.kwh_pos_partial = (data.buffer.readInt16BE(0) + data.buffer.readInt16BE(2) * 0x10000) / 10;
        currStatus.kvarh_pos_partial = (data.buffer.readInt16BE(4) + data.buffer.readInt16BE(6) * 0x10000) / 10;

        currStatus.kwh_pos_l1 = (data.buffer.readInt16BE(8) + data.buffer.readInt16BE(6) * 0x10000) / 10;
        currStatus.kwh_pos_l2 = (data.buffer.readInt16BE(12) + data.buffer.readInt16BE(6) * 0x10000) / 10;
        currStatus.kwh_pos_l3 = (data.buffer.readInt16BE(16) + data.buffer.readInt16BE(6) * 0x10000) / 10;
        currStatus.kwh_pos_t1 = (data.buffer.readInt16BE(20) + data.buffer.readInt16BE(10) * 0x10000) / 10;
        currStatus.kwh_pos_t2 = (data.buffer.readInt16BE(24) + data.buffer.readInt16BE(14) * 0x10000) / 10;

        // Energy meter version fields
        data = await client.readInputRegisters(0x302, 2);
        currStatus.firmware_version = data.buffer.readUInt16BE(0);
        currStatus.firmware_revision = data.buffer.readUInt16BE(2);
        influxTags.firmware_version = data.buffer.readUInt16BE(0);
        influxTags.firmware_revision = data.buffer.readUInt16BE(2);

        globals.logger.silly(`Data read: ${JSON.stringify(currStatus, null, 2)}`);

        // Write to InfluxDB
        globals.logger.debug('STATUS: Calling Influxdb posting method');
        postToInfluxdb.postStatusToInfluxdb(currStatus, influxTags);

        currStatus = {};
    } catch (err) {
        slack.slackPostMessage(`❌ Energy meter ${globals.config.get('EnergyMonitor.energyMeter.name')}: ${err}`);

        globals.logger.error(`MOXA: Error reading energy data ${err}`);
        globals.logger.error(`MOXA: Error reading energy data ${JSON.stringify(err, null, 2)}`);
    } finally {
        client.close();
    }
}

module.exports = {
    extractFromMoxa,
};
