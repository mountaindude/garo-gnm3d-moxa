const Influx = require('influx');
const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const config = require('config');
const Fastify = require('fastify');
const FastifyHealthcheck = require('fastify-healthcheck');

// Get app version from package.json file
const appVersion = require('../../package.json').version;

// Docker healthcheck server
const dockerHealthCheckServer = Fastify({ logger: false });

// Set up logger with timestamps and colors, and optional logging to disk file
const logTransports = [];

logTransports.push(
    new winston.transports.Console({
        name: 'console',
        level: config.get('EnergyMonitor.logLevel'),
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
        ),
    })
);

if (config.get('EnergyMonitor.fileLogging')) {
    logTransports.push(
        new winston.transports.DailyRotateFile({
            dirname: path.join(__dirname, config.get('EnergyMonitor.logDirectory')),
            filename: 'EnergyMonitor.%DATE%.log',
            level: config.get('EnergyMonitor.logLevel'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
        })
    );
}

const logger = winston.createLogger({
    transports: logTransports,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
});

// Function to get current logging level
function getLoggingLevel() {
    return logTransports.find((transport) => transport.name === 'console').level;
}

// Get list of standard and user configurable tags
// ..begin with standard tags
const tagValuesEnergy = ['monitor_name', 'monitor_id', 'phases', 'firmware_version', 'firmware_revision', 'garo_id'];
const tagValuesMemory = ['instance_tag'];

// Set up Influxdb client
const influx = new Influx.InfluxDB({
    host: config.get('EnergyMonitor.influxdbConfig.hostIP'),
    port: `${config.has('EnergyMonitor.influxdbConfig.hostPort') ? config.get('EnergyMonitor.influxdbConfig.hostPort') : '8086'}`,
    database: config.get('EnergyMonitor.influxdbConfig.dbName'),
    username: `${config.get('EnergyMonitor.influxdbConfig.auth.enable') ? config.get('EnergyMonitor.influxdbConfig.auth.username') : ''}`,
    password: `${config.get('EnergyMonitor.influxdbConfig.auth.enable') ? config.get('EnergyMonitor.influxdbConfig.auth.password') : ''}`,
    schema: [
        {
            measurement: config.get('EnergyMonitor.influxdbConfig.measurementName'),
            fields: {
                // System variables
                v_ln_sys: Influx.FieldType.FLOAT,
                v_ll_sys: Influx.FieldType.FLOAT,
                w_sys: Influx.FieldType.FLOAT,
                va_sys: Influx.FieldType.FLOAT,
                var_sys: Influx.FieldType.FLOAT,
                pf_sys: Influx.FieldType.FLOAT,
                phase_seq_sys: Influx.FieldType.FLOAT,
                hz: Influx.FieldType.FLOAT,

                // Total energies and dmd power
                kwh_pos_tot: Influx.FieldType.FLOAT,
                kvarh_pos_tot: Influx.FieldType.FLOAT,
                kwh_neg_tot: Influx.FieldType.FLOAT,
                kvarh_neg_tot: Influx.FieldType.FLOAT,
                kw_dmd: Influx.FieldType.FLOAT,
                kw_dmd_peak: Influx.FieldType.FLOAT,

                // Phase 1 (L1) variables
                l1_v_l1_l2: Influx.FieldType.FLOAT,
                l1_v_l1_n: Influx.FieldType.FLOAT,
                l1_a: Influx.FieldType.FLOAT,
                l1_w: Influx.FieldType.FLOAT,
                l1_va: Influx.FieldType.FLOAT,
                l1_var: Influx.FieldType.FLOAT,
                l1_pf: Influx.FieldType.FLOAT,

                // Phase 2 (L2) variables
                l2_v_l2_l3: Influx.FieldType.FLOAT,
                l2_v_l2_n: Influx.FieldType.FLOAT,
                l2_a: Influx.FieldType.FLOAT,
                l2_w: Influx.FieldType.FLOAT,
                l2_va: Influx.FieldType.FLOAT,
                l2_var: Influx.FieldType.FLOAT,
                l2_pf: Influx.FieldType.FLOAT,

                // Phase 3 (L3) variables
                l3_v_l2_l3: Influx.FieldType.FLOAT,
                l3_v_l2_n: Influx.FieldType.FLOAT,
                l3_a: Influx.FieldType.FLOAT,
                l3_w: Influx.FieldType.FLOAT,
                l3_va: Influx.FieldType.FLOAT,
                l3_var: Influx.FieldType.FLOAT,
                l3_pf: Influx.FieldType.FLOAT,

                // Other energies
                kwh_pos_partial: Influx.FieldType.FLOAT,
                kvarh_pos_partial: Influx.FieldType.FLOAT,
                kwh_pos_l1: Influx.FieldType.FLOAT,
                kwh_pos_l2: Influx.FieldType.FLOAT,
                kwh_pos_l3: Influx.FieldType.FLOAT,
                kwh_pos_t1: Influx.FieldType.FLOAT,
                kwh_pos_t2: Influx.FieldType.FLOAT,

                // Energy meter version fields
                firmware_version: Influx.FieldType.INTEGER,
                firmware_revision: Influx.FieldType.INTEGER,
                garo_id: Influx.FieldType.INTEGER,
            },
            tags: tagValuesEnergy,
        },
        {
            measurement: 'memory_usage',
            fields: {
                heap_used: Influx.FieldType.FLOAT,
                heap_total: Influx.FieldType.FLOAT,
                external: Influx.FieldType.FLOAT,
                process_memory: Influx.FieldType.FLOAT,
            },
            tags: tagValuesMemory,
        },
    ],
});

function initInfluxDB() {
    const dbName = config.get('EnergyMonitor.influxdbConfig.dbName');
    const enableInfluxdb = config.get('EnergyMonitor.influxdbConfig.enable');

    if (enableInfluxdb) {
        influx
            .getDatabaseNames()
            .then((names) => {
                if (!names.includes(dbName)) {
                    influx
                        .createDatabase(dbName)
                        .then(() => {
                            logger.info(`CONFIG: Created new InfluxDB database: ${dbName}`);

                            const newPolicy = config.get('EnergyMonitor.influxdbConfig.retentionPolicy');

                            // Create new default retention policy
                            influx
                                .createRetentionPolicy(newPolicy.name, {
                                    database: dbName,
                                    duration: newPolicy.duration,
                                    replication: 1,
                                    isDefault: false,
                                })
                                .then(() => {
                                    logger.info(`CONFIG: Created new InfluxDB retention policy: ${newPolicy.name}`);
                                })
                                .catch((err) => {
                                    logger.error(`CONFIG: Error creating new InfluxDB retention policy "${newPolicy.name}"! ${err.stack}`);
                                });
                        })
                        .catch((err) => {
                            logger.error(`CONFIG: Error creating new InfluxDB database "${dbName}"! ${err.stack}`);
                        });
                } else {
                    logger.info(`CONFIG: Found InfluxDB database: ${dbName}`);
                }
            })
            .catch((err) => {
                logger.error(`CONFIG: Error getting list of InfuxDB databases! ${err.stack}`);
            });
    }
}

async function startDockerHealthcheckServer() {
    await dockerHealthCheckServer.register(FastifyHealthcheck);

    // Start Docker healthcheck REST server on port set in config file
    if (config.has('EnergyMonitor.dockerHealthCheck.enable') && config.get('EnergyMonitor.dockerHealthCheck.enable')) {
        try {
            logger.verbose('MAIN: Starting Docker healthcheck server...');

            await dockerHealthCheckServer.listen({
                port: config.get('EnergyMonitor.dockerHealthCheck.port'),
            });

            logger.info(`MAIN: Started Docker healthcheck server on port ${config.get('EnergyMonitor.dockerHealthCheck.port')}.`);
        } catch (err) {
            logger.error(`MAIN: Error while starting Docker healthcheck server on port ${config.get('Butler.dockerHealthCheck.port')}.`);
            dockerHealthCheckServer.log.error(err);
            process.exit(1);
        }
    }
}

module.exports = {
    config,
    logger,
    getLoggingLevel,
    influx,
    appVersion,
    initInfluxDB,
    startDockerHealthcheckServer,
};
