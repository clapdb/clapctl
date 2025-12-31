import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { input, password as passwordPrompt } from '@inquirer/prompts'
import {
  type ClapDBCredentialData,
  ClapDBCredentialSchema,
  type CredentialFile,
  CredentialFileSchema,
} from '../schemas'
import { mask } from '../utils'

const CREDENTIAL_DIR = '.clapdb'
const CREDENTIAL_FILE = 'credentials.json'

export class ClapDBCredential {
  private credentialPath: string
  private credentialFile: CredentialFile | null = null
  public stackName: string
  public dataApiEndpoint = ''
  public licenseApiEndpoint = ''
  public tenant = ''
  public database = ''
  public username = ''
  public password = ''
  public sandbox = false

  constructor(stackName: string) {
    this.stackName = stackName
    this.credentialPath = join(homedir(), CREDENTIAL_DIR, CREDENTIAL_FILE)
  }

  get path(): string {
    return this.credentialPath
  }

  private async ensureCredentialDir(): Promise<void> {
    const dir = dirname(this.credentialPath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
  }

  private async loadCredentialFile(): Promise<void> {
    await this.ensureCredentialDir()

    if (!existsSync(this.credentialPath)) {
      this.credentialFile = { version: '1.0', profiles: {} }
      return
    }

    try {
      const content = await readFile(this.credentialPath, 'utf-8')
      const parsed = JSON.parse(content)
      this.credentialFile = CredentialFileSchema.parse(parsed)
    } catch {
      this.credentialFile = { version: '1.0', profiles: {} }
    }
  }

  async load(): Promise<void> {
    await this.loadCredentialFile()

    if (!this.credentialFile) {
      return
    }

    const profile = this.credentialFile.profiles[this.stackName]
    if (profile) {
      this.dataApiEndpoint = profile.dataApiEndpoint
      this.licenseApiEndpoint = profile.licenseApiEndpoint
      this.tenant = profile.tenant
      this.database = profile.database
      this.username = profile.username
      this.password = profile.password
      this.sandbox = profile.sandbox ?? false
    }
  }

  async save(): Promise<void> {
    await this.ensureCredentialDir()

    if (!this.credentialFile) {
      this.credentialFile = { version: '1.0', profiles: {} }
    }

    const now = new Date().toISOString()
    const existing = this.credentialFile.profiles[this.stackName]

    this.credentialFile.profiles[this.stackName] = {
      dataApiEndpoint: this.dataApiEndpoint,
      licenseApiEndpoint: this.licenseApiEndpoint,
      tenant: this.tenant,
      database: this.database,
      username: this.username,
      password: this.password,
      sandbox: this.sandbox,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    await writeFile(this.credentialPath, JSON.stringify(this.credentialFile, null, 2), 'utf-8')
  }

  async delete(): Promise<void> {
    await this.loadCredentialFile()

    if (this.credentialFile) {
      delete this.credentialFile.profiles[this.stackName]
      await writeFile(this.credentialPath, JSON.stringify(this.credentialFile, null, 2), 'utf-8')
    }
  }

  async readConfig(
    key: keyof ClapDBCredentialData,
    prompt: string,
    needMask: boolean,
  ): Promise<string> {
    const currentValue = this[key as keyof this] as string

    let displayValue = 'None'
    if (currentValue) {
      displayValue = needMask ? mask(currentValue) : currentValue
    }

    const promptFn = needMask ? passwordPrompt : input
    const newValue = await promptFn({
      message: `${prompt} [${displayValue}]:`,
    })

    return newValue || currentValue
  }

  isValid(): boolean {
    try {
      ClapDBCredentialSchema.parse({
        dataApiEndpoint: this.dataApiEndpoint,
        licenseApiEndpoint: this.licenseApiEndpoint,
        tenant: this.tenant,
        database: this.database,
        username: this.username,
        password: this.password,
        sandbox: this.sandbox,
      })
      return true
    } catch {
      return false
    }
  }

  isEmpty(): boolean {
    return (
      !this.dataApiEndpoint &&
      !this.licenseApiEndpoint &&
      !this.tenant &&
      !this.database &&
      !this.username &&
      !this.password
    )
  }

  toString(): string {
    return JSON.stringify(
      {
        stackName: this.stackName,
        dataApiEndpoint: this.dataApiEndpoint,
        licenseApiEndpoint: this.licenseApiEndpoint,
        tenant: this.tenant,
        database: this.database,
        username: this.username,
        password: mask(this.password),
        sandbox: this.sandbox,
      },
      null,
      2,
    )
  }
}

export async function loadClapDBCredential(stackName: string): Promise<ClapDBCredential> {
  const credential = new ClapDBCredential(stackName)
  await credential.load()
  return credential
}

export async function loadAllCredentials(): Promise<Map<string, ClapDBCredential>> {
  const credentialPath = join(homedir(), CREDENTIAL_DIR, CREDENTIAL_FILE)
  const credentials = new Map<string, ClapDBCredential>()

  if (!existsSync(credentialPath)) {
    return credentials
  }

  try {
    const content = await readFile(credentialPath, 'utf-8')
    const parsed = JSON.parse(content)
    const credentialFile = CredentialFileSchema.parse(parsed)

    for (const stackName of Object.keys(credentialFile.profiles)) {
      const credential = await loadClapDBCredential(stackName)
      credentials.set(stackName, credential)
    }
  } catch {
    // Return empty map on error
  }

  return credentials
}
