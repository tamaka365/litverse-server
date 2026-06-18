import closeWithGrace from 'close-with-grace'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import fs from 'node:fs'

import serviceApp from './app.js'

// Ensure logs directory exists for pino/file transport
fs.mkdirSync('./logs', { recursive: true })

/**
 * Do not use NODE_ENV to determine what logger (or any env related feature) to use
 * @see {@link https://www.youtube.com/watch?v=HMM7GJC5E2o}
 */
function getLoggerTargets() {
  const targets = []

  if (process.stdout.isTTY) {
    targets.push({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      },
      level: 'debug'
    })
  }

  targets.push(
    {
      target: 'pino/file',
      options: { destination: './logs/info.log' },
      level: 'info'
    },
    {
      target: 'pino/file',
      options: { destination: './logs/warn.log' },
      level: 'warn'
    },
    {
      target: 'pino/file',
      options: { destination: './logs/error.log' },
      level: 'error'
    }
  )

  return targets
}

const app = Fastify({
  logger: { transport: { targets: getLoggerTargets() } },
  connectionTimeout: 120_000,
  requestTimeout: 60_000,
  keepAliveTimeout: 10_000,
  ajv: {
    customOptions: {
      coerceTypes: 'array',
      removeAdditional: 'all'
    }
  }
})

app.register(fp(serviceApp))

closeWithGrace({ delay: 1000 }, async ({ err }) => {
  if (err != null) app.log.error(err)
  await app.close()
})

try {
  await app.ready()
  const port = app.config.PORT
  const host = process.env.HOST || '0.0.0.0'
  await app.listen({ port, host })
  app.log.info(`Server listening on http://${host}:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
