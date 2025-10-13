const axios = require('axios');
const crypto = require('crypto');
const { random } = require('lodash');

class Request {
  constructor(client) {
    this.client = client;
    this.cache = new Map();

    this.httpClient = axios.create({
      baseURL: 'https://i.instagram.com/',
      timeout: 30000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    });
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
        if (response.data.status === 'ok' || response.status === 200) return { body: response.data, headers: response.headers };
        throw new Error('Request failed');
      } catch (error) {
        if (attempt < retries) {
          attempt++;
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        throw error;
      }
    }
  }
}

module.exports = Request;
