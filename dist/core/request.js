const axios = require('axios');
const crypto = require('crypto');
const { random } = require('lodash');
const { CookieJar } = require('tough-cookie');

class Request {
  constructor(client) {
    this.client = client;
    this.cache = new Map();

    this.httpClient = axios.create({
      baseURL: 'https://i.instagram.com/',
      timeout: 30000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    });

    // Add response interceptor to handle cookies
    this.httpClient.interceptors.response.use(
      (response) => {
        this.handleCookies(response);
        return response;
      },
      (error) => {
        if (error.response) {
          this.handleCookies(error.response);
        }
        return Promise.reject(error);
      }
    );
  }

  signature(data) {
    return crypto.createHmac('sha256', this.client.state.signatureKey).update(data).digest('hex');
  }

  sign(payload) {
    const json = typeof payload === 'object' ? JSON.stringify(payload) : payload;
    return { ig_sig_key_version: this.client.state.signatureVersion, signed_body: `${this.signature(json)}.${json}` };
  }

  getDefaultHeaders() {
    return {
      'User-Agent': this.client.state.appUserAgent,
      'X-IG-App-ID': this.client.state.fbAnalyticsApplicationId,
      'X-IG-Device-ID': this.client.state.uuid,
      'X-IG-WWW-Claim': this.client.state.igWWWClaim || '0',
      'Authorization': this.client.state.authorization,
      'Accept-Language': this.client.state.language.replace('_', '-'),
      'Host': 'i.instagram.com',
      'Connection': 'keep-alive',
    };
  }

  async send(options, retries = 3) {
    const config = { ...options, headers: { ...this.getDefaultHeaders(), ...(options.headers || {}) } };

    if (options.form && (options.method === 'POST' || options.method === 'PUT')) {
      const formData = new URLSearchParams();
      Object.keys(options.form).forEach(key => formData.append(key, options.form[key]));
      config.data = formData.toString();
    }

    if (options.qs) config.params = options.qs;

    let attempt = 0;
    while (attempt <= retries) {
      try {
        const response = await this.httpClient(config);
        
        // Update state with response headers
        this.updateState(response);
        
        if (response.data.status === 'ok' || response.status === 200) {
          return { body: response.data, headers: response.headers };
        }
        
        // Check if it's a session-related error
        if (response.data.status === 'fail' && response.data.message === 'login_required') {
          throw new Error('Session expired - login required');
        }
        
        throw new Error('Request failed');
      } catch (error) {
        if (error.message === 'Session expired - login required') {
          throw error; // Don't retry session errors
        }
        
        if (attempt < retries) {
          attempt++;
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        throw error;
      }
    }
  }

  updateState(response) {
    const {
      'x-ig-set-www-claim': wwwClaim,
      'ig-set-authorization': auth,
      'ig-set-password-encryption-key-id': pwKeyId,
      'ig-set-password-encryption-pub-key': pwPubKey,
    } = response.headers;
    
    if (typeof wwwClaim === 'string') {
      this.client.state.igWWWClaim = wwwClaim;
    }
    if (typeof auth === 'string' && !auth.endsWith(':')) {
      this.client.state.authorization = auth;
    }
    if (typeof pwKeyId === 'string') {
      this.client.state.passwordEncryptionKeyId = pwKeyId;
    }
    if (typeof pwPubKey === 'string') {
      this.client.state.passwordEncryptionPubKey = pwPubKey;
    }
  }

  handleCookies(response) {
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader && this.client.state.cookieStore) {
      setCookieHeader.forEach(cookieString => {
        try {
          this.client.state.cookieStore.setCookieSync(
            cookieString,
            this.client.state.constants.HOST
          );
        } catch (error) {
          // Ignore cookie parsing errors
        }
      });
    }
  }
}

module.exports = Request;
