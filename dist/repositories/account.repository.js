const Repository = require('../core/repository');
const crypto = require('crypto');

/**
 * AccountRepository — handles login, logout, and account-related operations.
 * This version includes:
 * - Automatic encryption key refresh
 * - Realistic password encryption (AES-GCM + RSA)
 * - Enhanced error handling
 * - Auto-retry when encryption keys are invalid
 * - Optional verbose debug mode for developers
 */
class AccountRepository extends Repository {
  constructor(client) {
    super(client);
    this.maxLoginRetries = 2; // prevent infinite retry loops
  }

  /**
   * Attempt to log into Instagram using username and password.
   * Automatically encrypts the password, refreshes encryption keys if invalid,
   * and retries the request one more time when needed.
   */
  async login(credentials, attempt = 1) {
    const { username, password } = credentials;

    // Ensure encryption keys are available before trying login
    if (!this.client.state.passwordEncryptionPubKey) {
      await this.syncLoginExperiments();
    }

    // Encrypt password using Instagram's official method
    const { encrypted, time } = this.encryptPassword(password);

    try {
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

      // ✅ Successfully logged in
      if (this.client.state.verbose) {
        console.log('✅ [AccountRepository] Login successful for user:', username);
      }

      return response.body.logged_in_user;
    } catch (error) {
      if (this.client.state.verbose) {
        console.error('⚠️ [AccountRepository] Login error:', error?.data?.error_type || error.message);
      }

      // Auto-refresh encryption keys if Instagram invalidated them
      const invalidKey =
        error.data?.message?.includes('invalid password key') ||
        error.data?.error_type === 'invalid_password_encryption_key';

      if (invalidKey && attempt < this.maxLoginRetries) {
        if (this.client.state.verbose) {
          console.log('🔁 [AccountRepository] Refreshing encryption keys and retrying login...');
        }
        await this.refreshEncryptionKeys();
        return await this.login(credentials, attempt + 1);
      }

      // Handle specific known errors
      if (error.data?.two_factor_required) {
        const newError = new Error('Two factor authentication required');
        newError.name = 'IgLoginTwoFactorRequiredError';
        newError.response = error.response;
        throw newError;
      }

      if (error.data?.error_type === 'bad_password') {
        const newError = new Error('Bad password');
        newError.name = 'IgLoginBadPasswordError';
        newError.response = error.response;
        throw newError;
      }

      if (error.data?.error_type === 'invalid_user') {
        const newError = new Error('Invalid user');
        newError.name = 'IgLoginInvalidUserError';
        newError.response = error.response;
        throw newError;
      }

      // Handle checkpoint challenge
      if (error.data?.error_type === 'checkpoint_challenge_required') {
        const newError = new Error('Checkpoint challenge required');
        newError.name = 'IgCheckpointChallengeError';
        newError.response = error.response;
        throw newError;
      }

      // For all other unknown errors
      throw error;
    }
  }

  /**
   * Logs out the currently authenticated user.
   */
  async logout() {
    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/accounts/logout/',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
      }),
    });

    if (this.client.state.verbose) {
      console.log('👋 [AccountRepository] Logged out successfully.');
    }

    return response.body;
  }

  /**
   * Fetch current logged-in user info from Instagram.
   */
  async currentUser() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/accounts/current_user/',
      qs: { edit: true },
    });

    return response.body;
  }

  /**
   * Fetch new encryption keys by syncing login experiments.
   * Instagram provides a public key used for encrypting passwords.
   */
  async syncLoginExperiments() {
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

    // Store encryption keys if available in the response
    if (response.body?.encryption?.key_id && response.body?.encryption?.public_key) {
      this.client.state.passwordEncryptionKeyId = response.body.encryption.key_id;
      this.client.state.passwordEncryptionPubKey = response.body.encryption.public_key;

      if (this.client.state.verbose) {
        console.log('🔐 [AccountRepository] Encryption keys synced successfully.');
      }
    }

    return response.body;
  }

  /**
   * Refresh encryption keys by syncing again.
   * Used when server rejects a key during login.
   */
  async refreshEncryptionKeys() {
    if (this.client.state.verbose) {
      console.log('♻️ [AccountRepository] Refreshing encryption keys...');
    }
    await this.syncLoginExperiments();
  }

  /**
   * Helper: generate jazoest parameter (checksum of device info)
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
   * Encrypts a password using AES-GCM + RSA (same method used by Instagram app)
   */
  encryptPassword(password) {
    if (!this.client.state.passwordEncryptionPubKey) {
      // Fallback - return plain password if encryption key not available
      return {
        time: Math.floor(Date.now() / 1000).toString(),
        encrypted: password,
      };
    }

    const randKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    const rsaEncrypted = crypto.publicEncrypt(
      {
        key: Buffer.from(this.client.state.passwordEncryptionPubKey, 'base64').toString(),
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      randKey
    );

    const cipher = crypto.createCipheriv('aes-256-gcm', randKey, iv);
    const time = Math.floor(Date.now() / 1000).toString();
    cipher.setAAD(Buffer.from(time));

    const aesEncrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
    const sizeBuffer = Buffer.alloc(2, 0);
    sizeBuffer.writeInt16LE(rsaEncrypted.byteLength, 0);
    const authTag = cipher.getAuthTag();

    return {
      time,
      encrypted: Buffer.concat([
        Buffer.from([1, this.client.state.passwordEncryptionKeyId || 0]),
        iv,
        sizeBuffer,
        rsaEncrypted,
        authTag,
        aesEncrypted,
      ]).toString('base64'),
    };
  }
}

module.exports = AccountRepository;
