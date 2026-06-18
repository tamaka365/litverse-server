import env from '@fastify/env'

declare module 'fastify' {
  export interface FastifyInstance {
    config: {
      NODE_ENV: string
      PORT: number
      DATABASE_URL: string
      RATE_LIMIT_MAX: number
      CORS_ORIGINS: string
      JWT_SECRET: string
      JWT_EXPIRES_IN: string
      COOKIE_NAME: string
      WECHAT_APPID?: string
      WECHAT_SECRET?: string
      ALIYUN_OSS_ACCESS_KEY_ID?: string
      ALIYUN_OSS_ACCESS_KEY_SECRET?: string
      ALIYUN_OSS_BUCKET?: string
      ALIYUN_OSS_REGION?: string
      ALIYUN_OSS_HOST?: string
    }
  }
}

const schema = {
  type: 'object',
  required: ['DATABASE_URL', 'JWT_SECRET'],
  properties: {
    NODE_ENV: {
      type: 'string',
      default: 'development'
    },
    PORT: {
      type: 'number',
      default: 3000
    },
    DATABASE_URL: {
      type: 'string'
    },
    RATE_LIMIT_MAX: {
      type: 'number',
      default: 100
    },
    CORS_ORIGINS: {
      type: 'string',
      default: '' // Comma-separated list
    },
    JWT_SECRET: {
      type: 'string'
    },
    JWT_EXPIRES_IN: {
      type: 'string',
      default: '7d'
    },
    COOKIE_NAME: {
      type: 'string',
      default: 'session_id'
    },
    WECHAT_APPID: {
      type: 'string'
    },
    WECHAT_SECRET: {
      type: 'string'
    },
    ALIYUN_OSS_ACCESS_KEY_ID: {
      type: 'string'
    },
    ALIYUN_OSS_ACCESS_KEY_SECRET: {
      type: 'string'
    },
    ALIYUN_OSS_BUCKET: {
      type: 'string'
    },
    ALIYUN_OSS_REGION: {
      type: 'string'
    },
    ALIYUN_OSS_HOST: {
      type: 'string'
    }
  }
}

export const autoConfig = {
  // Schema to validate
  schema,

  // Needed to read .env in root folder
  dotenv: true
  // or, pass config options available on dotenv module
  // dotenv: {
  //   path: `${import.meta.dirname}/.env`,
  //   debug: true
  // }
}

/**
 * Environment variables plugin for application runtime configuration.
 * @see {@link https://github.com/fastify/fastify-env}
 */
export default env
