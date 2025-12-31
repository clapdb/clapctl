/**
 * ClapDB Authentication and API Services
 *
 * This module provides:
 * - Auth0 device code authentication flow
 * - ClapDB API client for deployment management
 * - License management
 */

import open from 'open'

// ============================================================================
// Types and Interfaces
// ============================================================================

/** Device code state returned from Auth0 */
export interface DeviceCodeState {
  /** Device code for token exchange */
  device_code: string
  /** User-facing code to display */
  user_code: string
  /** Complete verification URI with code */
  verification_uri_complete: string
  /** Seconds until code expires */
  expires_in: number
  /** Polling interval in seconds */
  interval: number
}

/** OAuth token response from Auth0 */
export interface TokenResponse {
  /** Access token for API calls */
  access_token: string
  /** ID token (JWT) */
  id_token?: string
  /** Refresh token for obtaining new access tokens */
  refresh_token?: string
  /** Granted scopes */
  scope?: string
  /** Token lifetime in seconds */
  expires_in: number
  /** Token type (e.g., 'Bearer') */
  token_type: string
  /** Error code if authentication failed */
  error?: string
  /** Human-readable error description */
  error_description?: string
}

/** License data returned from ClapDB API */
export interface LicenseData {
  /** License key */
  license: string
  /** License type */
  type?: string
  /** Maximum concurrent queries */
  concurrent?: number
  /** Expiration date */
  expire?: string
}

/** Detailed license information */
export interface LicenseDetail {
  /** License type (e.g., 'trial', 'enterprise') */
  type: string
  /** Maximum concurrent queries allowed */
  concurrent: number
  /** Expiration date or 'Never' */
  expire: string
}

// ============================================================================
// Constants
// ============================================================================

/** Auth0 and API configuration for different environments */
const AUTH0_CONFIG = {
  production: {
    apiEndpoint: 'https://api.clapdb.com',
    clientId: 'mw3ltuStF0uz2cJXUfZNFrPE4CmIrg05',
  },
  sandbox: {
    apiEndpoint: 'https://sandbox-api.clapdb.com',
    clientId: 'ZTuLbkvtinutsDeVVLt4aXCDfymuy7eG',
  },
} as const

/** Auth0 OAuth endpoints */
const AUTH0_ENDPOINTS = {
  deviceCode: 'https://clapdb.us.auth0.com/oauth/device/code',
  token: 'https://clapdb.us.auth0.com/oauth/token',
} as const

/** OAuth grant type for device code flow */
const DEVICE_CODE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code'

// ============================================================================
// Auth0 Service
// ============================================================================

/**
 * Auth0 Authentication Service
 *
 * Implements the OAuth 2.0 Device Authorization Grant flow for CLI authentication.
 * This allows users to authenticate via browser while the CLI waits for completion.
 *
 * @see https://auth0.com/docs/get-started/authentication-and-authorization-flow/device-authorization-flow
 *
 * @example
 * ```typescript
 * const auth = new Auth0Service()
 * const token = await auth.login()
 * console.log('Access token:', token.access_token)
 * ```
 */
export class Auth0Service {
  private readonly apiEndpoint: string
  private readonly clientId: string
  private readonly sandbox: boolean

  /**
   * Create a new Auth0 service instance
   *
   * @param sandbox - Whether to use sandbox environment (default: false)
   */
  constructor(sandbox = false) {
    const config = sandbox ? AUTH0_CONFIG.sandbox : AUTH0_CONFIG.production

    this.apiEndpoint = config.apiEndpoint
    this.clientId = config.clientId
    this.sandbox = sandbox
  }

  /**
   * Request a device code for authentication
   *
   * This is the first step of the device authorization flow.
   * The returned state contains the user code to display and the
   * verification URL to open in a browser.
   *
   * @returns Device code state
   * @throws Error if request fails
   */
  async getDeviceCode(): Promise<DeviceCodeState> {
    const payload = new URLSearchParams({
      client_id: this.clientId,
      scope: 'openid',
      audience: this.apiEndpoint,
    })

    const resp = await fetch(AUTH0_ENDPOINTS.deviceCode, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: payload.toString(),
    })

    if (!resp.ok) {
      throw new Error(`Failed to get device code: ${resp.status} ${resp.statusText}`)
    }

    return resp.json()
  }

  /**
   * Exchange device code for access token
   *
   * @param state - Device code state from getDeviceCode()
   * @returns Token response (may contain error if user hasn't authenticated yet)
   */
  async getToken(state: DeviceCodeState): Promise<TokenResponse> {
    const payload = new URLSearchParams({
      client_id: this.clientId,
      device_code: state.device_code,
      grant_type: DEVICE_CODE_GRANT_TYPE,
    })

    const resp = await fetch(AUTH0_ENDPOINTS.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: payload.toString(),
    })

    return resp.json()
  }

  /**
   * Poll for token until user completes authentication
   *
   * This method will keep polling the token endpoint at the specified
   * interval until the user authenticates or an error occurs.
   *
   * @param state - Device code state from getDeviceCode()
   * @returns Access token response
   * @throws Error if authentication fails or times out
   */
  async waitUntilUserLogsIn(state: DeviceCodeState): Promise<TokenResponse> {
    const intervalMs = state.interval * 1000

    while (true) {
      const tokenResponse = await this.getToken(state)

      if (tokenResponse.error) {
        if (tokenResponse.error === 'authorization_pending') {
          // User hasn't authenticated yet, keep polling
          await new Promise((resolve) => setTimeout(resolve, intervalMs))
          continue
        }
        // Other errors are terminal
        throw new Error(tokenResponse.error_description || tokenResponse.error)
      }

      return tokenResponse
    }
  }

  /**
   * Perform complete login flow
   *
   * This method:
   * 1. Requests a device code
   * 2. Opens the verification URL in the user's browser
   * 3. Polls until the user completes authentication
   *
   * @returns Access token response
   * @throws Error if any step fails
   */
  async login(): Promise<TokenResponse> {
    const state = await this.getDeviceCode()

    console.log('Please confirm this is the code displayed on browser')
    console.log(`Code: ${state.user_code}`)
    console.log('Waiting for user to login...')

    try {
      await open(state.verification_uri_complete)
    } catch {
      console.log(
        `Couldn't open the URL, please do it manually: ${state.verification_uri_complete}`,
      )
    }

    return this.waitUntilUserLogsIn(state)
  }

  /**
   * Request a license from ClapDB API
   *
   * @param bucket - S3 bucket name for the deployment
   * @param accessToken - Valid access token from login()
   * @returns License data
   * @throws Error if request fails
   */
  async requestLicense(bucket: string, accessToken: string): Promise<LicenseData> {
    const url = `${this.apiEndpoint}/license?bucket=${encodeURIComponent(bucket)}`

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!resp.ok) {
      throw new Error(`Failed to request license: ${resp.status} ${resp.statusText}`)
    }

    return resp.json()
  }
}

// ============================================================================
// ClapDB API Service
// ============================================================================

/**
 * ClapDB API Service
 *
 * Provides methods for interacting with the ClapDB management API,
 * including deployment registration and license management.
 *
 * @example
 * ```typescript
 * const api = new ClapDBAPIService()
 * await api.registerDeployment(token, 'my-bucket', 'https://license.example.com')
 * ```
 */
export class ClapDBAPIService {
  private readonly endpoint: string
  private readonly sandbox: boolean

  /**
   * Create a new ClapDB API service instance
   *
   * @param sandbox - Whether to use sandbox environment (default: false)
   */
  constructor(sandbox = false) {
    this.sandbox = sandbox
    this.endpoint = sandbox ? AUTH0_CONFIG.sandbox.apiEndpoint : AUTH0_CONFIG.production.apiEndpoint
  }

  /**
   * Register a deployment with ClapDB
   *
   * This associates an S3 bucket with the user's ClapDB account
   * for license management and analytics.
   *
   * @param accessToken - Valid access token
   * @param bucket - S3 bucket name
   * @param licenseEndpoint - URL of the license API endpoint
   * @throws Error if registration fails
   */
  async registerDeployment(
    accessToken: string,
    bucket: string,
    licenseEndpoint: string,
  ): Promise<void> {
    const cloudBucket = `aws/${bucket}`

    const resp = await fetch(`${this.endpoint}/v1/deployments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        cloud_bucket: cloudBucket,
        license_endpoint: licenseEndpoint,
      }),
    })

    if (resp.status !== 204) {
      throw new Error(`Failed to register deployment: ${resp.status}`)
    }
  }

  /**
   * Delete a deployment registration
   *
   * @param accessToken - Valid access token
   * @param bucket - S3 bucket name
   * @throws Error if deletion fails
   */
  async deleteDeployment(accessToken: string, bucket: string): Promise<void> {
    const cloudBucket = `aws/${bucket}`

    const resp = await fetch(`${this.endpoint}/v1/deployments`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        cloud_bucket: cloudBucket,
      }),
    })

    if (resp.status !== 204) {
      throw new Error(`Failed to delete deployment: ${resp.status}`)
    }
  }

  /**
   * Get detailed license information
   *
   * @param license - License key
   * @returns License details
   * @throws Error if request fails
   */
  async getLicenseInfo(license: string): Promise<LicenseDetail> {
    const resp = await fetch(`${this.endpoint}/show_license_details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ license }),
    })

    if (!resp.ok) {
      throw new Error(`Failed to get license info: ${resp.status}`)
    }

    return resp.json()
  }
}
