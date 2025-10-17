const Repository = require('../core/repository');
const crypto = require('crypto');

class AccountRepository extends Repository {
  constructor(client) {
    super(client);
    this.maxLoginRetries = 2;
  }

  async login(credentials, attempt = 1) {
    const { username, password } = credentials;

    if (!this.client.state.passwordEncryptionPubKey) {
      await this.syncLoginExperiments();
    }

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

      const user = response.body.logged_in_user;

      // Set important cookies for session management
      if (this.client.state.cookieStore && typeof this.client.state.cookieStore.setCookieSync === 'function') {
        // Set sessionid cookie
        this.client.state.cookieStore.setCookieSync(
          `sessionid=${user.pk}; Path=/; HttpOnly; Secure`,
          this.client.state.constants.HOST
        );
        
        // Set ds_user_id cookie
        this.client.state.cookieStore.setCookieSync(
          `ds_user_id=${user.pk}; Path=/; HttpOnly; Secure`,
          this.client.state.constants.HOST
        );
        
        // Set ds_user cookie
        this.client.state.cookieStore.setCookieSync(
          `ds_user=${user.username}; Path=/; HttpOnly; Secure`,
          this.client.state.constants.HOST
        );
      }
      
      // Update CSRF token
      this.client.state.cookieCsrfToken = user.csrf_token || this.client.state.cookieCsrfToken;

      if (this.client.state.verbose) {
        console.log('✅ [AccountRepository] Login successful for user:', username);
      }

      return user;
    } catch (error) {
      const invalidKey =
        error.data?.message?.includes('invalid password key') ||
        error.data?.error_type === 'invalid_password_encryption_key';

      if (invalidKey && attempt < this.maxLoginRetries) {
        await this.refreshEncryptionKeys();
        return await this.login(credentials, attempt + 1);
      }

      throw error;
    }
  }

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

    if (response.body?.encryption?.key_id && response.body?.encryption?.public_key) {
      this.client.state.passwordEncryptionKeyId = response.body.encryption.key_id;
      this.client.state.passwordEncryptionPubKey = response.body.encryption.public_key;
      if (this.client.state.verbose) console.log('🔐 [AccountRepository] Encryption keys synced.');
    }

    return response.body;
  }

  async refreshEncryptionKeys() {
    if (this.client.state.verbose) console.log('♻️ [AccountRepository] Refreshing encryption keys...');
    await this.syncLoginExperiments();
  }

  static createJazoest(input) {
    const buf = Buffer.from(input, 'ascii');
    let sum = 0;
    for (let i = 0; i < buf.byteLength; i++) sum += buf.readUInt8(i);
    return `2${sum}`;
  }

  async currentUser() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/accounts/current_user/',
    });

    return response.body;
  }

  async editProfile(options) {
    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/accounts/edit_profile/',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        ...options,
      }),
    });

    return response.body;
  }

  async changePassword(oldPassword, newPassword) {
    const response = await this.client.request.send({
      method: 'POST',
      url: '/api/v1/accounts/change_password/',
      form: this.client.request.sign({
        _csrftoken: this.client.state.cookieCsrfToken,
        _uuid: this.client.state.uuid,
        old_password: oldPassword,
        new_password1: newPassword,
        new_password2: newPassword,
      }),
    });

    return response.body;
  }

  async setBiography(biography) {
    return await this.editProfile({ biography });
  }

  async setProfilePicture(imagePath) {
    // This would require file upload implementation
    throw new Error('Profile picture upload not implemented yet');
  }

  async setPrivate() {
    return await this.editProfile({ is_private: '1' });
  }

  async setPublic() {
    return await this.editProfile({ is_private: '0' });
  }

  async getAccountInfo() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/accounts/current_user/',
    });

    return response.body;
  }

  async getAccountDetails() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/accounts/current_user/',
    });

    return response.body;
  }

  encryptPassword(password) {
    if (!this.client.state.passwordEncryptionPubKey) {
      return { time: Math.floor(Date.now() / 1000).toString(), encrypted: password };
    }

    const randKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    const rsaEncrypted = crypto.publicEncrypt(
      { key: Buffer.from(this.client.state.passwordEncryptionPubKey, 'base64').toString(), padding: crypto.constants.RSA_PKCS1_PADDING },
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
