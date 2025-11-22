const IgApiClient = require('./core/client');
const { IgApiClientError } = require('./errors');
const { RealtimeClient } = require('./realtime');
const constants = require('./constants/constants');
const sendmedia = require('./sendmedia');

module.exports = {
  IgApiClient,
  IgApiClientError,
  RealtimeClient,
  Topics: constants.Topics,
  REALTIME: constants.REALTIME,
  sendmedia
};