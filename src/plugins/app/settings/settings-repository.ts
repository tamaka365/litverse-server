import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { toResult } from '../../../utils/result.js'

declare module 'fastify' {
  interface FastifyInstance {
    settingsRepository: ReturnType<typeof createSettingsRepository>
  }
}

export function createSettingsRepository(fastify: FastifyInstance) {
  const db = fastify.kysely

  return {
    async getSetting(key: string) {
      return toResult(
        db
          .selectFrom('system_settings')
          .select(['value'])
          .where('key', '=', key)
          .executeTakeFirst()
          .then((row) => row?.value ?? null)
      )
    },

    async setSetting(key: string, value: string) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      return toResult(
        db
          .insertInto('system_settings')
          .values({
            key,
            value,
            updated_at: nowSeconds
          })
          .onConflict((oc) =>
            oc.column('key').doUpdateSet({
              value,
              updated_at: nowSeconds
            })
          )
          .execute()
      )
    },

    async getOssSettings() {
      return toResult(
        db
          .selectFrom('system_settings')
          .select(['key', 'value'])
          .where('key', 'like', 'oss_%')
          .execute()
          .then((rows) => {
            const settings: Record<string, string> = {}
            for (const row of rows) {
              settings[row.key] = row.value
            }
            return {
              accessKeyId: settings['oss_access_key_id'] || '',
              accessKeySecret: settings['oss_access_key_secret'] || '',
              bucket: settings['oss_bucket'] || '',
              region: settings['oss_region'] || '',
              host: settings['oss_host'] || ''
            }
          })
      )
    },

    async setOssSettings(settings: {
      accessKeyId: string
      accessKeySecret: string
      bucket: string
      region: string
      host: string
    }) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      const data = [
        {
          key: 'oss_access_key_id',
          value: settings.accessKeyId,
          updated_at: nowSeconds
        },
        {
          key: 'oss_access_key_secret',
          value: settings.accessKeySecret,
          updated_at: nowSeconds
        },
        {
          key: 'oss_bucket',
          value: settings.bucket,
          updated_at: nowSeconds
        },
        {
          key: 'oss_region',
          value: settings.region,
          updated_at: nowSeconds
        },
        {
          key: 'oss_host',
          value: settings.host,
          updated_at: nowSeconds
        }
      ]

      return toResult(
        db.transaction().execute(async (trx) => {
          for (const item of data) {
            await trx
              .insertInto('system_settings')
              .values(item)
              .onConflict((oc) =>
                oc.column('key').doUpdateSet({
                  value: item.value,
                  updated_at: nowSeconds
                })
              )
              .execute()
          }
        })
      )
    },

    async getCdnSettings() {
      return toResult(
        db
          .selectFrom('system_settings')
          .select(['key', 'value'])
          .where('key', 'like', 'cdn_%')
          .execute()
          .then((rows) => {
            const settings: Record<string, string> = {}
            for (const row of rows) {
              settings[row.key] = row.value
            }
            return {
              enabled: settings['cdn_enabled'] === 'true',
              domain: settings['cdn_domain'] || ''
            }
          })
      )
    },

    async setCdnSettings(settings: { enabled: boolean; domain: string }) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      const data = [
        {
          key: 'cdn_enabled',
          value: settings.enabled ? 'true' : 'false',
          updated_at: nowSeconds
        },
        {
          key: 'cdn_domain',
          value: settings.domain,
          updated_at: nowSeconds
        }
      ]

      return toResult(
        db.transaction().execute(async (trx) => {
          for (const item of data) {
            await trx
              .insertInto('system_settings')
              .values(item)
              .onConflict((oc) =>
                oc.column('key').doUpdateSet({
                  value: item.value,
                  updated_at: nowSeconds
                })
              )
              .execute()
          }
        })
      )
    }
  }
}

export default fp(
  async function (fastify: FastifyInstance) {
    fastify.decorate('settingsRepository', createSettingsRepository(fastify))
  },
  {
    name: 'settings-repository',
    dependencies: ['kysely']
  }
)
