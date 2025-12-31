/**
 * ClapDB Engine - Core service for interacting with ClapDB instances
 *
 * This module provides:
 * - SQL query execution
 * - Table management (create, describe)
 * - Dataset import functionality
 * - Version and license information retrieval
 */

import type { ClapDBCredential } from '../../credentials'

// ============================================================================
// Types and Interfaces
// ============================================================================

/** Supported data formats for import */
export type DataFormat =
  | 'CSV'
  | 'CSVRaw'
  | 'CSVWithNames'
  | 'CSVRawWithNames'
  | 'TSV'
  | 'TSVRaw'
  | 'TSVWithNames'
  | 'TSVRawWithNames'
  | 'NDJSON'
  | 'JSON'

/** Dataset definition for built-in sample datasets */
export interface Dataset {
  /** File name of the dataset (e.g., 'hdfs_logs.ndjson') */
  name: string
  /** Target table name in ClapDB */
  table: string
  /** Data format */
  format: DataFormat
  /** CREATE TABLE SQL statement */
  sql: string
  /** Approximate number of rows */
  rows: number
  /** Approximate disk space required */
  diskSpace: string
  /** S3 URI for the dataset (set dynamically based on region) */
  s3Uri?: string
}

/** Table metadata returned from ClapDB */
export interface TableMeta {
  table?: string
  columns?: Array<{ name: string; type: string }>
}

/** Response from dataset import operation */
export interface ImportResponse {
  /** Request ID for tracking import progress */
  reqId: string
  /** S3 bucket containing the data */
  bucket: string
  /** S3 key/path */
  key: string
  /** Byte ranges being processed */
  ranges: Array<[number, number]>
}

/** License information from ClapDB instance */
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

/** Valid data formats for ClapDB import */
const VALID_FORMATS = new Set<DataFormat>([
  'CSV',
  'CSVRaw',
  'CSVWithNames',
  'CSVRawWithNames',
  'TSV',
  'TSVRaw',
  'TSVWithNames',
  'TSVRawWithNames',
  'NDJSON',
  'JSON',
])

/** AWS regions where ClapDB datasets are available */
const SUPPORTED_DATASET_REGIONS = new Set([
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-south-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'cn-north-1',
  'cn-northwest-1',
])

// ============================================================================
// Built-in Datasets
// ============================================================================

/**
 * Pre-defined sample datasets available for import.
 * These datasets are hosted on ClapDB's public S3 buckets.
 */
export const DATASETS: Dataset[] = [
  {
    name: 'line_changes.ndjson',
    table: 'line_changes',
    format: 'NDJSON',
    sql: `CREATE TABLE line_changes (
      sign int8,
      line_number_old uint32,
      line_number_new uint32,
      hunk_num uint32,
      hunk_start_line_number_old uint32,
      hunk_start_line_number_new uint32,
      hunk_lines_added uint32,
      hunk_lines_deleted uint32,
      hunk_context enum,
      line enum,
      indent uint8,
      line_type enum,
      prev_commit_hash enum,
      prev_author enum,
      prev_time timestamp,
      file_change_type enum,
      path enum,
      old_path enum,
      file_extension enum,
      file_lines_added uint32,
      file_lines_deleted uint32,
      file_hunks_added uint32,
      file_hunks_removed uint32,
      file_hunks_changed uint32,
      commit_hash enum,
      author enum,
      time timestamp,
      commit_message text,
      commit_files_added uint32,
      commit_files_deleted uint32,
      commit_files_renamed uint32,
      commit_files_modified uint32,
      commit_lines_added uint32,
      commit_lines_deleted uint32,
      commit_hunks_added uint32,
      commit_hunks_removed uint32,
      commit_hunks_changed uint32
    );`,
    rows: 93317599,
    diskSpace: '98.3 GB',
  },
  {
    name: 'hdfs_logs.ndjson',
    table: 'hdfs_logs',
    format: 'NDJSON',
    sql: `CREATE TABLE hdfs_logs (
      timestamp int,
      severity_text enum,
      body text,
      resource jsonb,
      attributes jsonb,
      tenant_id int
    );`,
    rows: 20000000,
    diskSpace: '6.7 GB',
  },
  {
    name: 'hdfs_plain_logs.ndjson',
    table: 'hdfs_plain_logs',
    format: 'NDJSON',
    sql: `CREATE TABLE hdfs_plain_logs (
      timestamp int,
      severity_text enum,
      body text,
      service enum,
      class enum,
      tenant_id int
    );`,
    rows: 20000000,
    diskSpace: '6.4 GB',
  },
  {
    name: 'mgbench2.csv',
    table: 'mgbench_logs2',
    format: 'CSVRawWithNames',
    sql: `CREATE TABLE mgbench_logs2 (
      log_time timestamp,
      client_ip ipv4,
      request text,
      status_code uint16,
      object_size uint64
    );`,
    rows: 75748118,
    diskSpace: '5.7G',
  },
  {
    name: 'hits.tsv',
    table: 'hits',
    format: 'TSVRaw',
    sql: `CREATE TABLE hits (
      WatchID BIGINT NOT NULL,
      JavaEnable SMALLINT NOT NULL,
      Title TEXT NOT NULL,
      GoodEvent SMALLINT NOT NULL,
      EventTime TIMESTAMP NOT NULL,
      EventDate Date NOT NULL,
      CounterID INTEGER NOT NULL,
      ClientIP INTEGER NOT NULL,
      RegionID INTEGER NOT NULL,
      UserID BIGINT NOT NULL,
      CounterClass SMALLINT NOT NULL,
      OS SMALLINT NOT NULL,
      UserAgent SMALLINT NOT NULL,
      URL TEXT NOT NULL,
      Referer TEXT NOT NULL,
      IsRefresh SMALLINT NOT NULL,
      RefererCategoryID SMALLINT NOT NULL,
      RefererRegionID INTEGER NOT NULL,
      URLCategoryID SMALLINT NOT NULL,
      URLRegionID INTEGER NOT NULL,
      ResolutionWidth SMALLINT NOT NULL,
      ResolutionHeight SMALLINT NOT NULL,
      ResolutionDepth SMALLINT NOT NULL,
      FlashMajor SMALLINT NOT NULL,
      FlashMinor SMALLINT NOT NULL,
      FlashMinor2 TEXT NOT NULL,
      NetMajor SMALLINT NOT NULL,
      NetMinor SMALLINT NOT NULL,
      UserAgentMajor SMALLINT NOT NULL,
      UserAgentMinor VARCHAR(255) NOT NULL,
      CookieEnable SMALLINT NOT NULL,
      JavascriptEnable SMALLINT NOT NULL,
      IsMobile SMALLINT NOT NULL,
      MobilePhone SMALLINT NOT NULL,
      MobilePhoneModel TEXT NOT NULL,
      Params TEXT NOT NULL,
      IPNetworkID INTEGER NOT NULL,
      TraficSourceID SMALLINT NOT NULL,
      SearchEngineID SMALLINT NOT NULL,
      SearchPhrase TEXT NOT NULL,
      AdvEngineID SMALLINT NOT NULL,
      IsArtifical SMALLINT NOT NULL,
      WindowClientWidth SMALLINT NOT NULL,
      WindowClientHeight SMALLINT NOT NULL,
      ClientTimeZone SMALLINT NOT NULL,
      ClientEventTime TIMESTAMP NOT NULL,
      SilverlightVersion1 SMALLINT NOT NULL,
      SilverlightVersion2 SMALLINT NOT NULL,
      SilverlightVersion3 INTEGER NOT NULL,
      SilverlightVersion4 SMALLINT NOT NULL,
      PageCharset TEXT NOT NULL,
      CodeVersion INTEGER NOT NULL,
      IsLink SMALLINT NOT NULL,
      IsDownload SMALLINT NOT NULL,
      IsNotBounce SMALLINT NOT NULL,
      FUniqID BIGINT NOT NULL,
      OriginalURL TEXT NOT NULL,
      HID INTEGER NOT NULL,
      IsOldCounter SMALLINT NOT NULL,
      IsEvent SMALLINT NOT NULL,
      IsParameter SMALLINT NOT NULL,
      DontCountHits SMALLINT NOT NULL,
      WithHash SMALLINT NOT NULL,
      HitColor CHAR NOT NULL,
      LocalEventTime TIMESTAMP NOT NULL,
      Age SMALLINT NOT NULL,
      Sex SMALLINT NOT NULL,
      Income SMALLINT NOT NULL,
      Interests SMALLINT NOT NULL,
      Robotness SMALLINT NOT NULL,
      RemoteIP INTEGER NOT NULL,
      WindowName INTEGER NOT NULL,
      OpenerName INTEGER NOT NULL,
      HistoryLength SMALLINT NOT NULL,
      BrowserLanguage TEXT NOT NULL,
      BrowserCountry TEXT NOT NULL,
      SocialNetwork TEXT NOT NULL,
      SocialAction TEXT NOT NULL,
      HTTPError SMALLINT NOT NULL,
      SendTiming INTEGER NOT NULL,
      DNSTiming INTEGER NOT NULL,
      ConnectTiming INTEGER NOT NULL,
      ResponseStartTiming INTEGER NOT NULL,
      ResponseEndTiming INTEGER NOT NULL,
      FetchTiming INTEGER NOT NULL,
      SocialSourceNetworkID SMALLINT NOT NULL,
      SocialSourcePage TEXT NOT NULL,
      ParamPrice BIGINT NOT NULL,
      ParamOrderID TEXT NOT NULL,
      ParamCurrency TEXT NOT NULL,
      ParamCurrencyID SMALLINT NOT NULL,
      OpenstatServiceName TEXT NOT NULL,
      OpenstatCampaignID TEXT NOT NULL,
      OpenstatAdID TEXT NOT NULL,
      OpenstatSourceID TEXT NOT NULL,
      UTMSource TEXT NOT NULL,
      UTMMedium TEXT NOT NULL,
      UTMCampaign TEXT NOT NULL,
      UTMContent TEXT NOT NULL,
      UTMTerm TEXT NOT NULL,
      FromTag TEXT NOT NULL,
      HasGCLID SMALLINT NOT NULL,
      RefererHash BIGINT NOT NULL,
      URLHash BIGINT NOT NULL,
      CLID INTEGER NOT NULL
    );`,
    rows: 99997497,
    diskSpace: '69.7 GB',
  },
  {
    name: 'wikipedia_embedded.csv',
    table: 'wikipedia_embedded',
    format: 'CSVWithNames',
    sql: `CREATE TABLE wikipedia_embedded (
      id int,
      url text,
      title text,
      text text,
      title_vector vector(1536, 'float32'),
      content_vector vector(1536, 'float32'),
      vector_id int
    );`,
    rows: 25000,
    diskSpace: '1.7 GB',
  },
]

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a format string is a valid ClapDB data format
 */
export function isValidFormat(format: string): format is DataFormat {
  return VALID_FORMATS.has(format as DataFormat)
}

/**
 * Generate S3 URI for a dataset in a specific AWS region
 *
 * @param dataset - Dataset to get S3 URI for
 * @param region - AWS region
 * @returns S3 URI string
 * @throws Error if region is not supported
 */
export function getDatasetS3Uri(dataset: Dataset, region: string): string {
  if (!SUPPORTED_DATASET_REGIONS.has(region)) {
    throw new Error(`Region ${region} not supported for datasets`)
  }
  return `https://clapdb-datasets-${region}.s3.dualstack.${region}.amazonaws.com/${dataset.name}`
}

/**
 * Find a dataset by name from the built-in datasets
 *
 * @param name - Dataset name to search for
 * @returns Dataset if found, undefined otherwise
 */
export function findDataset(name: string): Dataset | undefined {
  return DATASETS.find((d) => d.name === name)
}

// ============================================================================
// ClapDB Engine Class
// ============================================================================

/**
 * ClapDB Engine - Main client for interacting with ClapDB instances
 *
 * Provides methods for:
 * - Executing SQL queries
 * - Managing tables
 * - Importing datasets
 * - Retrieving version and license information
 *
 * @example
 * ```typescript
 * const credential = await loadClapDBCredential('my-stack')
 * const engine = new ClapDBEngine(credential)
 *
 * // Execute a query
 * const result = await engine.executeSQL('SELECT * FROM users LIMIT 10')
 *
 * // Import a dataset
 * const dataset = findDataset('hdfs_logs.ndjson')
 * await engine.importDataset(dataset, 'us-east-1')
 * ```
 */
export class ClapDBEngine {
  private readonly dataEndpoint: string
  private readonly licenseEndpoint: string
  private readonly username: string
  private readonly password: string
  private readonly tenant: string
  private readonly database: string

  /**
   * Create a new ClapDB Engine instance
   *
   * @param credential - ClapDB credential containing endpoint and auth info
   * @throws Error if credential is invalid
   */
  constructor(credential: ClapDBCredential) {
    if (!credential.isValid()) {
      throw new Error('Invalid ClapDB credential')
    }

    this.dataEndpoint = credential.dataApiEndpoint
    this.licenseEndpoint = credential.licenseApiEndpoint
    this.username = credential.username
    this.password = credential.password
    this.tenant = credential.tenant
    this.database = credential.database
  }

  /**
   * Get the user identifier with tenant (format: "username.tenant")
   */
  private getUserWithTenant(): string {
    return `${this.username}.${this.tenant}`
  }

  /**
   * Make an authenticated HTTP request to the ClapDB API
   *
   * @param url - Request URL
   * @param method - HTTP method
   * @param body - Request body (optional)
   * @param headers - Additional headers (optional)
   * @returns Fetch Response
   */
  private async makeRequest(
    url: string,
    method: string,
    body?: string,
    headers?: Record<string, string>,
  ): Promise<Response> {
    const auth = Buffer.from(`${this.getUserWithTenant()}:${this.password}`).toString('base64')

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Authorization: `Basic ${auth}`,
      ...headers,
    }

    return fetch(url, {
      method,
      headers: requestHeaders,
      body,
    })
  }

  // --------------------------------------------------------------------------
  // Table Operations
  // --------------------------------------------------------------------------

  /**
   * Get metadata for a table
   *
   * @param tableName - Name of the table
   * @returns Table metadata or null if table doesn't exist
   */
  async describeTable(tableName: string): Promise<TableMeta | null> {
    const url = `${this.dataEndpoint}/meta?database=${this.database}&table=${tableName}`
    const resp = await this.makeRequest(url, 'GET')

    if (resp.status === 404) {
      return null
    }

    if (!resp.ok) {
      throw new Error(`Failed to describe table: ${resp.status} ${resp.statusText}`)
    }

    return resp.json()
  }

  /**
   * Check if a table exists
   *
   * @param tableName - Name of the table
   * @returns true if table exists, false otherwise
   */
  async tableExists(tableName: string): Promise<boolean> {
    const meta = await this.describeTable(tableName)
    return meta !== null && meta.table !== undefined
  }

  /**
   * Create a new table
   *
   * @param tableName - Name of the table to create
   * @param sql - CREATE TABLE SQL statement
   * @throws Error if table already exists or creation fails
   */
  async createTable(tableName: string, sql: string): Promise<void> {
    const exists = await this.tableExists(tableName)
    if (exists) {
      throw new Error(`Table ${tableName} already exists`)
    }

    const url = `${this.dataEndpoint}/psql?database=${this.database}&table=${tableName}`
    const resp = await this.makeRequest(url, 'POST', sql)

    if (!resp.ok) {
      throw new Error(`Failed to create table: ${resp.status} ${resp.statusText}`)
    }
  }

  // --------------------------------------------------------------------------
  // Dataset Import
  // --------------------------------------------------------------------------

  /**
   * Import a dataset from S3 into ClapDB
   *
   * @param dataset - Dataset definition
   * @param region - AWS region where the dataset is located
   * @returns Import response with tracking information
   * @throws Error if format is invalid or import fails
   */
  async importDataset(dataset: Dataset, region: string): Promise<ImportResponse> {
    if (!isValidFormat(dataset.format)) {
      throw new Error(`Dataset ${dataset.name} has invalid format: ${dataset.format}`)
    }

    const s3Uri = getDatasetS3Uri(dataset, region)
    const url = `${this.dataEndpoint}/psql?database=${this.database}`
    const importSQL = `INSERT INTO ${dataset.table} SELECT * FROM s3('${s3Uri}', '${dataset.format}')`

    console.log(`Import SQL: ${importSQL}`)

    const resp = await this.makeRequest(url, 'POST', importSQL)

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`Failed to import dataset: ${resp.status} ${body}`)
    }

    const data = await resp.json()
    return {
      reqId: data.req_id || data.reqId || '',
      bucket: data.bucket || '',
      key: data.key || '',
      ranges: data.ranges || [],
    }
  }

  // --------------------------------------------------------------------------
  // SQL Execution
  // --------------------------------------------------------------------------

  /**
   * Execute a SQL statement
   *
   * @param statement - SQL statement to execute
   * @param format - Response format ('json' or 'ndjson')
   * @returns Query result as string
   * @throws Error if execution fails
   */
  async executeSQL(statement: string, format: 'json' | 'ndjson' = 'json'): Promise<string> {
    const url = `${this.dataEndpoint}/psql?database=${this.database}`

    const headers: Record<string, string> = {
      'x-pset-value': 'null=NULL',
    }

    if (format === 'ndjson') {
      headers.Accept = 'application/x-ndjson'
    }

    const resp = await this.makeRequest(url, 'POST', statement, headers)

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`Failed to execute SQL: ${resp.status} ${body}`)
    }

    return resp.text()
  }

  // --------------------------------------------------------------------------
  // Version and License
  // --------------------------------------------------------------------------

  /**
   * Get the ClapDB version (commit hash)
   *
   * @returns Version string
   */
  async getVersion(): Promise<string> {
    const url = `${this.dataEndpoint}/psql`
    const resp = await this.makeRequest(url, 'POST', 'SELECT 1')
    return resp.headers.get('x-clap-hash') || 'unknown'
  }

  /**
   * Get license details from the ClapDB instance
   *
   * @returns License information
   */
  async getLicenseDetail(): Promise<LicenseDetail> {
    const url = `${this.dataEndpoint}/psql`
    const resp = await this.makeRequest(url, 'POST', 'SELECT 1')

    const concurrent = Number.parseInt(resp.headers.get('x-clap-license-concurrent') || '0', 10)
    const expire = resp.headers.get('x-clap-license-expires') || 'Never'
    const type = resp.headers.get('x-clap-license-type') || 'unknown'

    return { type, concurrent, expire }
  }
}
