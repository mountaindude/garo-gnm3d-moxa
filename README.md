# garo-gnm3d-moxa

[![Build Status](https://cloud.drone.io/api/badges/mountaindude/garo-gnm3d-moxa/status.svg)](https://cloud.drone.io/mountaindude/garo-gnm3d-moxa)

## Overview

This repository contains code for extracting data from [Garo 3-phase energy meter GNM3D-RS485](http://www.garo.se/en/installation/din-rail-components/energy-meters/energymeter-3p-modbus-rs485).

The meter expose meter readings via a RS-485 interface.  
A [Moxa 5630](https://www.moxa.com/en/products/industrial-edge-connectivity/serial-device-servers/general-device-servers/nport-5600-series/nport-5630-16) serial-to-tcp converter is used to make the meter readings available via a TCP port.
Once the energy data has been extracted it's stored in an InfluxDB time series database.

Optionally, info and failure notifications can be sent to a Slack channel.

## Technical details

### Hardware

- [Garo GNM3D-RS485](http://www.garo.se/en/installation/din-rail-components/energy-meters/energymeter-3p-modbus-rs485)
- [Moxa 5630-16](https://www.moxa.com/en/products/industrial-edge-connectivity/serial-device-servers/general-device-servers/nport-5600-series/nport-5630-16)

Other serial-to-TCP Moxa devices might also work too - they have a pretty wide product range.

[A sibling repository](https://github.com/mountaindude/garo-gnm1d-moxa) contains code for Garo 1-phase meter GNM1D-RS485.

### Software

- The code is developed and tested against Node.js 20.
- The service can be run as a native Node.js app, but Docker is by far the preferred option for running the service. Kubernetes also works really well, but requries more infrastructure, setup etc.
- Docker images (mountaindude/garo-gnm3d-moxa) is available from Docker hub. It's automatically updated as new releases are done here on GitHub.
- An InfluxDB database is needed. InfluxDB runs very nicely as a Docker container (just make sure to store the actual data outside of the InfluxDB container, so it's not lost if the InfluxDB container is recreated).
- Optional: A Slack account to which notifications can be sent.

### Reference docs

- [Garo Modbus documentation](http://www.garo.se/storage/ma/e6fe0c38363f490c9ab35eb996b4ee07/f88b91a174ac49f7807e0291b29a53a1/pdf/5/108047_5_Protocol%20GNM3D,-T%20Modbus.pdf)
- [Moxa 5630-16 data sheet](https://www.moxa.com/getmedia/837892c5-53ec-4f1a-81d4-46c844fe5c2a/moxa-nport-5600-series-datasheet-v1.4.pdf)

## Configuration file

The file `production_template` can be used as a starting point when configuring the service. Many features (uptime monitoring, healthcheck pings etc) are optional and can be disabled if so desired - but keep the settings in the YAML config file anyway (errors are likely to happen otherwise).

```yaml
EnergyMonitor:
  # Logging configuration
  logLevel: info     # Log level. Possible log levels are silly, debug, verbose, info, warn, error
  fileLogging: true   # true/false to enable/disable logging to disk file
  logDirectory: logs  # Subdirectory where log files are stored

  energyMeter:
    name: 'server_rack'
    description: 'Energy data for servers'
    id: 1
    phaseCount: 3

  slack:
    webhookURL: <Slack webhook URL>
    channel: <channel name>

  # Heartbeats can be used to send "I'm alive" messages to any other tool, e.g. a infrastructure monitoring tool
  # The concept is simple: The remoteURL will be called at the specified frequency. The receiving tool will then know 
  # that the energy monitor is alive.
  heartbeat:
      enable: false
      remoteURL: <URL which should be called>
      frequency: 60000

  # Docker health checks are used when running the energy monitor as a Docker container. 
  # The Docker engine will call the container's health check REST endpoint with a set interval to determine
  # whether the container is alive/well or not.
  # If you are not using Docker you can safely disable this feature. 
  dockerHealthCheck:
      enable: false    # Control whether a REST endpoint will be set up to serve Docker health check messages
      port: 12398      # Port the Docker health check service runs on (if enabled)

  # Uptime monitor
  uptimeMonitor:
    enable: true                   # Should uptime messages be written to the console and log files?
    frequency: 60000               #
    logLevel: verbose              # Starting at what log level should uptime messages be shown?
    storeInInfluxdb: 
      enable: true
      instanceTag: server_rack     # Tag that can be used to differentiate data from multiple instances

  # Influx db config parameters
  influxdbConfig:
    enableInfluxdb: true
    hostIP: <IP or FQDN of InfluxDB server>
    hostPort: <InfluxDB port>
    auth:
      enable: false
      username: <InfluxDB username>
      password: <Pwd of user>
    dbName: <InfluxDB database name> 
    measurementName: energy_server_rack

    # Default retention policy that should be created in InfluxDB when the service creates a new database there. 
    # Any data older than retention policy threshold will be purged from InfluxDB.
    retentionPolicy:
      name: 10d
      duration: 10d

  moxa:
    queryInterval: 5000   # 5 sec
    # queryInterval: 30000   # 30 sec
    # queryInterval: 150000   # Every 2.5 min
    # queryInterval: 300000   # Every 5 min  
    host: <IP or Moxa serial to TCP converter>
    port: <Port on Moxa>
    deviceId: <RS485 device ID set in energy meter. 1 by default>
```
