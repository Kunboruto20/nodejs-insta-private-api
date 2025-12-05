const IgApiClient = require('./core/client');
const { IgApiClientError } = require('./errors');
const { RealtimeClient, IrisHandshake, SkywalkerProtocol, PresenceManager, DMSender, ErrorHandler, GapHandler, EnhancedDirectCommands, PresenceTypingMixin } = require('./realtime');
const constants = require('./constants/constants');
const sendmedia = require('./sendmedia');
const { useMultiFileAuthState, MultiFileAuthState, extractStateData, applyStateData } = require('./useMultiFileAuthState');

module.exports = {
  IgApiClient,
  IgApiClientError,
  RealtimeClient,
  // v5.18+ Protocols & Features
  IrisHandshake,
  SkywalkerProtocol,
  PresenceManager,
  DMSender,
  ErrorHandler,
  GapHandler,
  EnhancedDirectCommands,
  PresenceTypingMixin,
  // Constants
  Topics: constants.Topics,
  REALTIME: constants.REALTIME,
  sendmedia,
  // Multi-file auth state (like Baileys)
  useMultiFileAuthState,
  MultiFileAuthState,
  extractStateData,
  applyStateData
};