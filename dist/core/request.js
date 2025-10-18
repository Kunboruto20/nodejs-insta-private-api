const axios = require('axios');
const crypto = require('crypto');
const { random } = require('lodash');

class Request {
  constructor(client) {
    this.client = client;
    this.end$ = { complete: () => {} };
    this.error$ = { complete: () => {} };
    
    // Create axios instance with default config
    this.httpClient = axios.create({
      baseURL: 'https://i.instagram.com/',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      }
    });
  }

  signature(data) {
    return crypto.createHmac('sha256', this.client.state.signatureKey)
      .update(data)
      .digest('hex');
  }

  sign(payload) {
    const json = typeof payload === 'object' ? JSON.stringify(payload) : payload;
    const signature = this.signature(json);
    return {
      ig_sig_key_version: this.client.state.signatureVersion,
      signed_body: `${signature}.${json}`,
    };
  }

  userBreadcrumb(size) {
    const term = random(2, 3) * 1000 + size + random(15, 20) * 1000;
    const textChangeEventCount = Math.round(size / random(2, 3)) || 1;
    const data = `${size} ${term} ${textChangeEventCount} ${Date.now()}`;
    const signature = Buffer.from(
      crypto.createHmac('sha256', this.client.state.userBreadcrumbKey)
        .update(data)
        .digest('hex'),
    ).toString('base64');
    const body = Buffer.from(data).toString('base64');
    return `${signature}\n${body}\n`;
  }

  async send(options) {
    const config = {
      ...options,
      headers: {
        ...this.getDefaultHeaders(),
        ...(options.headers || {})
      }
    };

    // Handle form data
    if (options.form) {
      if (options.method === 'POST' || options.method === 'PUT') {
        const formData = new URLSearchParams();
        Object.keys(options.form).forEach(key => {
          formData.append(key, options.form[key]);
        });
        config.data = formData.toString();
      }
    }

    // Handle query parameters
    if (options.qs) {
      config.params = options.qs;
    }

    try {
      const response = await this.httpClient(config);
      this.updateState(response);
      
      if (response.data.status === 'ok' || response.status === 200) {
        return { body: response.data, headers: response.headers };
      }
      
      throw this.handleResponseError(response);
    } catch (error) {
      if (error.response) {
        throw this.handleResponseError(error.response);
      }
      throw error;
    }
  }

  updateState(response) {
    const headers = response.headers;
    
    if (headers['x-ig-set-www-claim']) {
      this.client.state.igWWWClaim = headers['x-ig-set-www-claim'];
    }
    if (headers['ig-set-authorization'] && !headers['ig-set-authorization'].endsWith(':')) {
      this.client.state.authorization = headers['ig-set-authorization'];
    }
    if (headers['ig-set-password-encryption-key-id']) {
      this.client.state.passwordEncryptionKeyId = headers['ig-set-password-encryption-key-id'];
    }
    if (headers['ig-set-password-encryption-pub-key']) {
      this.client.state.passwordEncryptionPubKey = headers['ig-set-password-encryption-pub-key'];
    }

    // Update cookies from Set-Cookie headers
    const setCookieHeaders = headers['set-cookie'];
    if (setCookieHeaders) {
      setCookieHeaders.forEach(cookieString => {
        try {
          this.client.state.cookieStore.setCookieSync(cookieString, this.client.state.constants.HOST);
        } catch (e) {
          // Ignore cookie parsing errors
        }
      });
    }
  }

  handleResponseError(response) {
    const data = response.data || {};
    
    if (data.spam) {
      const error = new Error('Action blocked as spam');
      error.name = 'IgActionSpamError';
      error.response = response;
      return error;
    }
    
    if (response.status === 404) {
      const error = new Error('Not found');
      error.name = 'IgNotFoundError';
      error.response = response;
      return error;
    }
    
    if (data.message === 'challenge_required') {
      this.client.state.checkpoint = data;
      const error = new Error('Challenge required');
      error.name = 'IgCheckpointError';
      error.response = response;
      return error;
    }
    
    if (data.message === 'user_has_logged_out') {
      const error = new Error('User has logged out');
      error.name = 'IgUserHasLoggedOutError';
      error.response = response;
      return error;
    }
    
    if (data.message === 'login_required') {
      const error = new Error('Login required');
      error.name = 'IgLoginRequiredError';
      error.response = response;
      return error;
    }
    
    if (data.error_type === 'sentry_block') {
      const error = new Error('Sentry block');
      error.name = 'IgSentryBlockError';
      error.response = response;
      return error;
    }
    
    if (data.error_type === 'inactive user') {
      const error = new Error('Inactive user');
      error.name = 'IgInactiveUserError';
      error.response = response;
      return error;
    }

    const error = new Error(data.message || 'Request failed');
    error.name = 'IgResponseError';
    error.response = response;
    error.status = response.status;
    error.data = data;
    return error;
  }

  getDefaultHeaders() {
    return {
      'User-Agent': this.client.state.appUserAgent,
      'X-Ads-Opt-Out': this.client.state.adsOptOut ? '1' : '0',
      'X-IG-App-Locale': this.client.state.language,
      'X-IG-Device-Locale': this.client.state.language,
      'X-Pigeon-Session-Id': this.client.state.pigeonSessionId,
      'X-Pigeon-Rawclienttime': (Date.now() / 1000).toFixed(3),
      'X-IG-Connection-Speed': `${random(1000, 3700)}kbps`,
      'X-IG-Bandwidth-Speed-KBPS': '-1.000',
      'X-IG-Bandwidth-TotalBytes-B': '0',
      'X-IG-Bandwidth-TotalTime-MS': '0',
      'X-IG-Extended-CDN-Thumbnail-Cache-Busting-Value': this.client.state.thumbnailCacheBustingValue.toString(),
      'X-Bloks-Version-Id': this.client.state.bloksVersionId,
      'X-IG-WWW-Claim': this.client.state.igWWWClaim || '0',
      'X-Bloks-Is-Layout-RTL': this.client.state.isLayoutRTL.toString(),
      'X-IG-Connection-Type': this.client.state.connectionTypeHeader,
      'X-IG-Capabilities': this.client.state.capabilitiesHeader,
      'X-IG-App-ID': this.client.state.fbAnalyticsApplicationId,
      'X-IG-Device-ID': this.client.state.uuid,
      'X-IG-Android-ID': this.client.state.deviceId,
      'Accept-Language': this.client.state.language.replace('_', '-'),
      'X-FB-HTTP-Engine': 'Liger',
      'Authorization': this.client.state.authorization,
      'Host': 'i.instagram.com',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
    };
  }
}

module.exports = Request;