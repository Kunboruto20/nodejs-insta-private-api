class IgApiClientError extends Error {
  constructor(message) {
    super(message);
    this.name = 'IgApiClientError';
  }
}

class IgLoginRequiredError extends IgApiClientError {
  constructor(response) {
    super('Login required');
    this.name = 'IgLoginRequiredError';
    this.response = response;
  }
}

class IgLoginBadPasswordError extends IgApiClientError {
  constructor(response) {
    super('Bad password');
    this.name = 'IgLoginBadPasswordError';
    this.response = response;
  }
}

class IgLoginInvalidUserError extends IgApiClientError {
  constructor(response) {
    super('Invalid user');
    this.name = 'IgLoginInvalidUserError';
    this.response = response;
  }
}

class IgLoginTwoFactorRequiredError extends IgApiClientError {
  constructor(response) {
    super('Two factor authentication required');
    this.name = 'IgLoginTwoFactorRequiredError';
    this.response = response;
    this.twoFactorInfo = response.data?.two_factor_info;
  }
}

class IgCheckpointError extends IgApiClientError {
  constructor(response) {
    super('Checkpoint challenge required');
    this.name = 'IgCheckpointError';
    this.response = response;
    this.checkpoint = response.data;
  }
}

class IgChallengeWrongCodeError extends IgApiClientError {
  constructor(response) {
    super('Challenge verification code is incorrect');
    this.name = 'IgChallengeWrongCodeError';
    this.response = response;
  }
}

class IgActionSpamError extends IgApiClientError {
  constructor(response) {
    super('Action blocked as spam');
    this.name = 'IgActionSpamError';
    this.response = response;
  }
}

class IgNotFoundError extends IgApiClientError {
  constructor(response) {
    super('Requested resource not found');
    this.name = 'IgNotFoundError';
    this.response = response;
  }
}

class IgPrivateUserError extends IgApiClientError {
  constructor(response) {
    super('User account is private');
    this.name = 'IgPrivateUserError';
    this.response = response;
  }
}

class IgUserHasLoggedOutError extends IgApiClientError {
  constructor(response) {
    super('User has logged out');
    this.name = 'IgUserHasLoggedOutError';
    this.response = response;
  }
}

class IgInactiveUserError extends IgApiClientError {
  constructor(response) {
    super('User account is inactive');
    this.name = 'IgInactiveUserError';
    this.response = response;
  }
}

class IgSentryBlockError extends IgApiClientError {
  constructor(response) {
    super('Request blocked by security measures');
    this.name = 'IgSentryBlockError';
    this.response = response;
  }
}

class IgResponseError extends IgApiClientError {
  constructor(response) {
    super(response.data?.message || 'Request failed');
    this.name = 'IgResponseError';
    this.response = response;
    this.status = response.status;
    this.data = response.data;
  }
}

class IgNetworkError extends IgApiClientError {
  constructor(error) {
    super('Network error occurred');
    this.name = 'IgNetworkError';
    this.originalError = error;
  }
}

class IgUploadError extends IgApiClientError {
  constructor(message, response) {
    super(message || 'Upload failed');
    this.name = 'IgUploadError';
    this.response = response;
  }
}

class IgConfigureMediaError extends IgApiClientError {
  constructor(message, response) {
    super(message || 'Media configuration failed');
    this.name = 'IgConfigureMediaError';
    this.response = response;
  }
}

class IgCookieNotFoundError extends IgApiClientError {
  constructor(cookieName) {
    super(`Required cookie '${cookieName}' not found`);
    this.name = 'IgCookieNotFoundError';
    this.cookieName = cookieName;
  }
}

class IgUserIdNotFoundError extends IgApiClientError {
  constructor() {
    super('User ID not found in session');
    this.name = 'IgUserIdNotFoundError';
  }
}

class IgNoCheckpointError extends IgApiClientError {
  constructor() {
    super('No checkpoint available');
    this.name = 'IgNoCheckpointError';
  }
}

module.exports = {
  IgApiClientError,
  IgLoginRequiredError,
  IgLoginBadPasswordError,
  IgLoginInvalidUserError,
  IgLoginTwoFactorRequiredError,
  IgCheckpointError,
  IgChallengeWrongCodeError,
  IgActionSpamError,
  IgNotFoundError,
  IgPrivateUserError,
  IgUserHasLoggedOutError,
  IgInactiveUserError,
  IgSentryBlockError,
  IgResponseError,
  IgNetworkError,
  IgUploadError,
  IgConfigureMediaError,
  IgCookieNotFoundError,
  IgUserIdNotFoundError,
  IgNoCheckpointError
};