const IgApiClient = require('./core/client');
const { IgApiClientError } = require('./errors');
const RealtimeService = require('./services/realtime.service');

module.exports = {
  IgApiClient,
  IgApiClientError,
  RealtimeService
};