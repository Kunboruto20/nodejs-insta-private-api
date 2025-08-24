const Repository = require('../core/repository');
const crypto = require('crypto');

class AccountRepository extends Repository {
  async login(credentials) {
    const { username, password, email } = credentials;
    
    // First sync login experiments to get encryption keys
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
      
      return response.body.logged_in_user;
    } catch (error) {
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
    
    return response.body;
  }

  async currentUser() {
    const response = await this.client.request.send({
      method: 'GET',
      url: '/api/v1/accounts/current_user/',
      qs: {
        edit: true
      }
    });
    
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
    
    return response.body;
  }

  static createJazoest(input) {
    const buf = Buffer.from(input, 'ascii');
    let sum = 0;
    for (let i = 0; i < buf.byteLength; i++) {
      sum += buf.readUInt8(i);
    }
    return `2${sum}`;
  }

  encryptPassword(password) {
    if (!this.client.state.passwordEncryptionPubKey) {
      // Fallback - return unencrypted password
      return {
        time: Math.floor(Date.now() / 1000).toString(),
        encrypted: password
      };
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
}

module.exports = AccountRepository;