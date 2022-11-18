/* eslint-disable no-console */
// Set up REST endpoint for Docker healthchecks

const httpHealth = require('http');

const optionsHealth = {
    host: 'localhost',
    port: '12398',
    timeout: 2000,
};

const requestHealth = httpHealth.request(optionsHealth, (res) => {
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

requestHealth.on('error', (err) => {
    console.log('ERROR Docker health:');
    console.log(err);
    process.exit(1);
});

requestHealth.end();
