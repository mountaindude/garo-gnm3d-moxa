/* eslint-disable prefer-destructuring */
const ModbusRTU = require('modbus-serial');

const globals = require('./globals');
const { postStatusToInfluxdb } = require('./post-to-influxdb');
const slack = require('./slack');

// create an empty modbus client
const client = new ModbusRTU();

async function extractFromMoxa() {
    try {
        const influxTags = {
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
        currStatus.v_ln_sys = (data.data[0] + data.data[1] * 0x10000) / 10;
        currStatus.v_ll_sys = (data.data[2] + data.data[3] * 0x10000) / 10;
        currStatus.w_sys = (data.data[4] + data.data[5] * 0x10000) / 10;
        currStatus.va_sys = (data.data[6] + data.data[7] * 0x10000) / 10;
        currStatus.var_sys = (data.data[8] + data.data[9] * 0x10000) / 10;
        currStatus.pf_sys = (data.data[10] + data.data[11] * 0x10000) / 1000;
        currStatus.phase_seq_sys = (data.data[12] + data.data[13] * 0x10000);
        currStatus.hz = (data.data[14] + data.data[15] * 0x10000) / 10;

        // Total energies and dmd power
        data = await client.readInputRegisters(0x112, 12);
        currStatus.kwh_pos_tot = (data.data[0] + data.data[1] * 0x10000) / 10;
        currStatus.kvarh_pos_tot = (data.data[2] + data.data[3] * 0x10000) / 10;
        currStatus.kwh_neg_tot = (data.data[4] + data.data[5] * 0x10000) / 10;
        currStatus.kvarh_neg_tot = (data.data[6] + data.data[7] * 0x10000) / 10;
        currStatus.kw_dmd = (data.data[8] + data.data[9] * 0x10000) / 10;
        currStatus.kw_dmd_peak = (data.data[10] + data.data[11] * 0x10000) / 10;

        // Phase 1 (L1) variables
        data = await client.readInputRegisters(0x11e, 14);
        currStatus.l1_v_l1_l2 = (data.data[0] + data.data[1] * 0x10000) / 10;
        currStatus.l1_v_l1_n = (data.data[2] + data.data[3] * 0x10000) / 10;
        currStatus.l1_a = (data.data[4] + data.data[5] * 0x10000) / 1000;
        currStatus.l1_w = (data.data[6] + data.data[7] * 0x10000) / 10;
        currStatus.l1_va = (data.data[8] + data.data[9] * 0x10000) / 10;
        currStatus.l1_var = (data.data[10] + data.data[11] * 0x10000) / 10;
        currStatus.l1_pf = (data.data[12] + data.data[13] * 0x10000) / 1000;

        // Phase 2 (L2) variables
        data = await client.readInputRegisters(0x12c, 14);
        currStatus.l2_v_l2_l3 = (data.data[0] + data.data[1] * 0x10000) / 10;
        currStatus.l2_v_l2_n = (data.data[2] + data.data[3] * 0x10000) / 10;
        currStatus.l2_a = (data.data[4] + data.data[5] * 0x10000) / 1000;
        currStatus.l2_w = (data.data[6] + data.data[7] * 0x10000) / 10;
        currStatus.l2_va = (data.data[8] + data.data[9] * 0x10000) / 10;
        currStatus.l2_var = (data.data[10] + data.data[11] * 0x10000) / 10;
        currStatus.l2_pf = (data.data[12] + data.data[13] * 0x10000) / 1000;

        // Phase 3 (L3) variables
        data = await client.readInputRegisters(0x13a, 14);
        currStatus.l3_v_l2_l3 = (data.data[0] + data.data[1] * 0x10000) / 10;
        currStatus.l3_v_l2_n = (data.data[2] + data.data[3] * 0x10000) / 10;
        currStatus.l3_a = (data.data[4] + data.data[5] * 0x10000) / 1000;
        currStatus.l3_w = (data.data[6] + data.data[7] * 0x10000) / 10;
        currStatus.l3_va = (data.data[8] + data.data[9] * 0x10000) / 10;
        currStatus.l3_var = (data.data[10] + data.data[11] * 0x10000) / 10;
        currStatus.l3_pf = (data.data[12] + data.data[13] * 0x10000) / 1000;

        // Other energies
        data = await client.readInputRegisters(0x148, 14);
        currStatus.kwh_pos_partial = (data.data[0] + data.data[1] * 0x10000) / 10;
        currStatus.kvarh_pos_partial = (data.data[2] + data.data[3] * 0x10000) / 10;
        currStatus.kwh_pos_l1 = (data.data[4] + data.data[5] * 0x10000) / 10;
        currStatus.kwh_pos_l2 = (data.data[6] + data.data[7] * 0x10000) / 10;
        currStatus.kwh_pos_l3 = (data.data[8] + data.data[9] * 0x10000) / 10;
        currStatus.kwh_pos_t1 = (data.data[10] + data.data[11] * 0x10000) / 10;
        currStatus.kwh_pos_t2 = (data.data[12] + data.data[13] * 0x10000) / 10;

        // Energy meter version fields
        data = await client.readInputRegisters(0x302, 2);
        currStatus.firmware_version = data.data[0];
        currStatus.firmware_revision = data.data[1];
        influxTags.firmware_version = data.data[0];
        influxTags.firmware_revision = data.data[1];

        // GARO identification code
        data = await client.readInputRegisters(0x00b, 1);
        currStatus.garo_id = data.data[0];
        influxTags.garo_id = data.data[0];

        globals.logger.silly(`Data read: ${JSON.stringify(currStatus, null, 2)}`);

        // Write to InfluxDB
        if (globals.config.get('EnergyMonitor.influxdbConfig.enable')) {
            globals.logger.debug('STATUS: Calling Influxdb posting method');
            postStatusToInfluxdb(currStatus, influxTags);
        }

        currStatus = {};
    } catch (err) {
        // console.log(
        //     `❌ EXTRACT_FROM_MOXA: Energy meter ${globals.config.get('EnergyMonitor.energyMeter.name')}: "${err.errno}", "${err.message}"`
        // );
        slack.slackPostMessage(
            `❌ EXTRACT_FROM_MOXA: Energy meter ${globals.config.get('EnergyMonitor.energyMeter.name')}: "${err.errno}", "${err.message}"`
        );

        globals.logger.error(`MOXA: Error reading energy data ${err}`);
        globals.logger.error(`MOXA: Error reading energy data ${JSON.stringify(err, null, 2)}`);
    } finally {
        client.close();
    }
}

module.exports = {
    extractFromMoxa,
};
