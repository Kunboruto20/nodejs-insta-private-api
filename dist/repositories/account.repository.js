const Repository = require('../core/repository');
const crypto = require('crypto');

class AccountRepository extends Repository {
  constructor(client) {
    super(client);
    // Default max retries for any request
    this.maxRetries = 3;
  }

  /**
   * Generic request wrapper with retry and debug logging
   * @param {Function} requestFn - async function performing request
   * @param {number} retries - current retry count
   */
  async requestWithRetry(requestFn, retries = 0) {
    try {
      if (process.env.DEBUG) console.log(`[DEBUG] Attempt #${retries + 1}`);
      const result = await requestFn();
      return result;
    } catch (error) {
      const shouldRetry =
        (error.data?.error_type === 'server_error' ||
         error.data?.error_type === 'rate_limited') &&
        retries < this.maxRetries;

      if (shouldRetry) {
        const delay = 1000 * (retries + 1);
        if (process.env.DEBUG) console.log(`[DEBUG] Retrying after ${delay}ms due to ${error.data?.error_type}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.requestWithRetry(requestFn, retries + 1);
      }

      throw error;
    }
  }

  /**
   * Login with username/password
   * @param {Object|string} credentialsOrUsername - { username, password } or username string
   * @param {string} passwordArg - password (if first arg is username string)
   */
  async login(credentialsOrUsername, passwordArg) {
    let username, password;
    
    // Support both object and separate parameters
    if (typeof credentialsOrUsername === 'object' && credentialsOrUsername !== null) {
      username = credentialsOrUsername.username;
      password = credentialsOrUsername.password;
    } else {
      username = credentialsOrUsername;
      password = passwordArg;
    }
    
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // Ensure encryption keys are ready
    if (!this.client.state.passwordEncryptionPubKey) {
      await this.syncLoginExperiments();
    }

    const { encrypted, time } = this.encryptPassword(password);

    if (process.env.DEBUG) {
      console.log(`[DEBUG] Logging in user: ${username}, encrypted password length: ${encrypted.length}`);
    }

    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'POST',
        url: '/api/v1/accounts/login/',
        form: this.client.request.sign({
          username,
          enc_password: `#PWD_INSTAGRAM:4:${time}:${encrypted}`,
          guid: this.client.state.uuid,
          phone_id: this.client.state.phoneId,
          _csrftoken: this.client.state.cookieCsrfToken,
          device_id: this.client.state.deviceId,
          adid: this.client.state.adid,
          google_tokens: '[]',
          login_attempt_count: 0,
          country_codes: JSON.stringify([{ country_code: '1', source: 'default' }]),
          jazoest: AccountRepository.createJazoest(this.client.state.phoneId),
        }),
      });

      // Handle common login errors
      const body = response.body;
      if (body.two_factor_required) {
        const err = new Error('Two factor authentication required');
        err.name = 'IgLoginTwoFactorRequiredError';
        throw err;
      }
      if (body.error_type === 'bad_password') {
        const err = new Error('Bad password');
        err.name = 'IgLoginBadPasswordError';
        throw err;
      }
      if (body.error_type === 'invalid_user') {
        const err = new Error('Invalid user');
        err.name = 'IgLoginInvalidUserError';
        throw err;
      }

      return body.logged_in_user;
    });
  }

  /**
   * Logout user
   */
  async logout() {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'POST',
        url: '/api/v1/accounts/logout/',
        form: this.client.request.sign({
          _csrftoken: this.client.state.cookieCsrfToken,
          _uuid: this.client.state.uuid,
        }),
      });
      return response.body;
    });
  }

  /**
   * Get current user
   */
  async currentUser() {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'GET',
        url: '/api/v1/accounts/current_user/',
        qs: { edit: true },
      });
      return response.body;
    });
  }

  /**
   * Sync login experiments (required for encryption keys)
   */
  async syncLoginExperiments() {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        method: 'POST',
        url: '/api/v1/qe/sync/',
        form: this.client.request.sign({
          _csrftoken: this.client.state.cookieCsrfToken,
          id: this.client.state.uuid,
          server_config_retrieval: '1',
          experiments: this.client.state.constants.LOGIN_EXPERIMENTS,
        }),
      });
      return response.body;
    });
  }

  /**
   * Create jazoest string from input
   * @param {string} input
   */
  static createJazoest(input) {
    const buf = Buffer.from(input, 'ascii');
    let sum = 0;
    for (let i = 0; i < buf.byteLength; i++) {
      sum += buf.readUInt8(i);
    }
    return `2${sum}`;
  }

  /**
   * Encrypt password using Instagram's password encryption
   * @param {string} password
   */
  encryptPassword(password) {
    if (!this.client.state.passwordEncryptionPubKey) {
      console.warn('[WARN] Password encryption key missing. Using plaintext password.');
      return { time: Math.floor(Date.now() / 1000).toString(), encrypted: password };
    }

    const randKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    const rsaEncrypted = crypto.publicEncrypt({
      key: Buffer.from(this.client.state.passwordEncryptionPubKey, 'base64').toString(),
      padding: crypto.constants.RSA_PKCS1_PADDING,
    }, randKey);

    const cipher = crypto.createCipheriv('aes-256-gcm', randKey, iv);
    const time = Math.floor(Date.now() / 1000).toString();
    cipher.setAAD(Buffer.from(time));

    const aesEncrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
    const sizeBuffer = Buffer.alloc(2, 0);
    sizeBuffer.writeInt16LE(rsaEncrypted.byteLength, 0);
    const authTag = cipher.getAuthTag();

    if (process.env.DEBUG) {
      console.log(`[DEBUG] AES length: ${aesEncrypted.length}, RSA length: ${rsaEncrypted.length}`);
    }

    return {
      time,
      encrypted: Buffer.concat([
        Buffer.from([1, this.client.state.passwordEncryptionKeyId || 0]),
        iv,
        sizeBuffer,
        rsaEncrypted,
        authTag,
        aesEncrypted
      ]).toString('base64')
    };
  }

  /**
   * Send password recovery request to Instagram via email
   * @param {string} query - Username, email, or phone number
   */
  async sendRecoveryFlowEmail(query) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: '/api/v1/accounts/send_recovery_flow_email/',
        method: 'POST',
        form: this.client.request.sign({
          _csrftoken: this.client.state.cookieCsrfToken,
          adid: '',
          guid: this.client.state.uuid,
          device_id: this.client.state.deviceId,
          query,
        }),
      });
      return response.body;
    });
  }

  /**
   * Send password recovery request to Instagram via SMS
   * @param {string} query - Username, email, or phone number
   */
  async sendRecoveryFlowSms(query) {
    return this.requestWithRetry(async () => {
      const response = await this.client.request.send({
        url: '/api/v1/accounts/send_recovery_flow_sms/',
        method: 'POST',
        form: this.client.request.sign({
          _csrftoken: this.client.state.cookieCsrfToken,
          adid: '',
          guid: this.client.state.uuid,
          device_id: this.client.state.deviceId,
          query,
        }),
      });
      return response.body;
    });
  }
}

module.exports = AccountRepository;
