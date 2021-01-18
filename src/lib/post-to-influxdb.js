'use strict';

const globals = require('./globals');

function postStatusToInfluxdb(energyData, influxTags) {
    // Build tags structure that will be passed to InfluxDB
    globals.logger.debug(`ENERGY DATA: Tags sent to InfluxDB: ${JSON.stringify(influxTags)}`);

    // Write the whole reading to Influxdb
    globals.influx
        .writePoints([
            {
                measurement: globals.config.get('EnergyMonitor.influxdbConfig.measurementName'),
                tags: influxTags,
                fields: {
                    // System variables
                    v_ln_sys: energyData.v_ln_sys,
                    v_ll_sys: energyData.v_ll_sys,
                    w_sys: energyData.w_sys,
                    va_sys: energyData.va_sys,
                    var_sys: energyData.var_sys,
                    pf_sys: energyData.pf_sys,
                    phase_seq_sys: energyData.phase_seq_sys,
                    hz: energyData.hz,
            
                    // Total energies and dmd power
                    kwh_pos_tot: energyData.kwh_pos_tot,
                    kvarh_pos_tot: energyData.kvarh_pos_tot,
                    kwh_neg_tot: energyData.kwh_neg_tot,
                    kvarh_neg_tot: energyData.kvarh_neg_tot,
                    kw_dmd: energyData.kw_dmd,
                    kw_dmd_peak: energyData.kw_dmd_peak,
            
                    // Phase 1 (L1) variables
                    l1_v_l1_l2: energyData.l1_v_1_l2,
                    l1_v_l1_n: energyData.l1_v_l1_n,
                    l1_a: energyData.l1_a,
                    l1_w: energyData.l1_w,
                    l1_va: energyData.l1_va,
                    l1_var: energyData.l1_var,
                    l1_pf: energyData.l1_pf,
            
                    // Phase 2 (L2) variables
                    l2_v_l2_l3: energyData.l2_v_l2_l3,
                    l2_v_l2_n: energyData.l2_v_l2_n,
                    l2_a: energyData.l2_a,
                    l2_w: energyData.l2_w,
                    l2_va: energyData.l2_va,
                    l2_var: energyData.l2_var,
                    l2_pf: energyData.l2_pf,
            
                    // Phase 3 (L3) variables
                    l3_v_l2_l3: energyData.l3_v_l2_l3,
                    l3_v_l2_n: energyData.l3_v_l2_n,
                    l3_a: energyData.l3_a,
                    l3_w: energyData.l3_w,
                    l3_va: energyData.l3_va,
                    l3_var: energyData.l3_var,
                    l3_pf: energyData.l3_pf,
            
                    // Other energies
                    kwh_pos_partial: energyData.kwh_pos_partial,
                    kvarh_pos_partial: energyData.kvarh_pos_partial,
                    kwh_pos_l1: energyData.kwh_pos_l1,
                    kwh_pos_l2: energyData.kwh_pos_l2,
                    kwh_pos_l3: energyData.kwh_pos_l3,
                    kwh_pos_t1: energyData.kwh_pos_t1,
                    kwh_pos_t2: energyData.kwh_pos_t2,
            
                    // Energy meter version fields
                    firmware_version: energyData.firmware_version,
                    firmware_revision: energyData.firmware_revision
                },
            },
        ])

        .then(() => {
            globals.logger.verbose('ENERGY DATA: Sent data to Influxdb.');
        })

        .catch(err => {
            globals.logger.error(`ENERGY DATA: Error saving status to InfluxDB! ${err.stack}`);
        });
}

function postMemoryUsageToInfluxdb(memory, influxTags) {
    // Tags structure that will be passed to InfluxDB
    globals.logger.debug(`MEMORY DATA: Tags sent to InfluxDB: ${JSON.stringify(influxTags)}`);

    // Write the whole reading to Influxdb
    globals.influx
        .writePoints([
            {
                measurement: 'memory_usage',
                tags: influxTags,
                fields: {
                    heap_used: memory.heapUsed,
                    heap_total: memory.heapTotal,
                    external: memory.external,
                    process_memory: memory.processMemory,
                },
            },
        ])

        .then(() => {
            globals.logger.verbose('MEMORY DATA: Sent data to Influxdb.');
        })

        .catch(err => {
            globals.logger.error(`MEMORY DATA: Error saving status to InfluxDB! ${err.stack}`);
        });
}

module.exports = {
    postStatusToInfluxdb,
    postMemoryUsageToInfluxdb,
};
