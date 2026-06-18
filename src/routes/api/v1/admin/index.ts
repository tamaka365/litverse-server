import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  AdminArtworksListResponseSchema,
  AdminArtworksQuery,
  AdminArtworksQuerySchema,
  ArtworkMutationResponseSchema,
  CreateArtworkRequest,
  CreateArtworkRequestSchema,
  UpdateArtworkRequest,
  UpdateArtworkRequestSchema
} from '../../../../schemas/v1/artworks.js'
import {
  AdminLoginRequest,
  AdminLoginResponseSchema
} from '../../../../schemas/v1/auth.js'
import {
  AdminPostersQuery,
  AdminPostersQuerySchema,
  AdminPostersResponseSchema,
  UpdatePosterStatusRequest,
  UpdatePosterStatusRequestSchema
} from '../../../../schemas/v1/posters.js'
import {
  QuestionsResponseSchema,
  SaveQuestionsRequest,
  SaveQuestionsRequestSchema
} from '../../../../schemas/v1/questions.js'
import {
  OssSettingsRequest,
  OssSettingsRequestSchema,
  OssSettingsResponseSchema
} from '../../../../schemas/v1/settings.js'
import { DashboardStatsResponseSchema } from '../../../../schemas/v1/stats.js'
import {
  AdminUsersListRequestQuery,
  AdminUsersListRequestQuerySchema,
  AdminUsersListResponseSchema,
  CreateAdminAccountRequest,
  CreateAdminAccountRequestSchema,
  UpdateAdminPasswordRequest,
  UpdateAdminPasswordRequestSchema,
  AdminAccountsListResponseSchema,
  UpdateAdminAccountRequest,
  UpdateAdminAccountRequestSchema
} from '../../../../schemas/v1/users.js'
import { getOssUploadSignature } from '../../../../utils/oss.js'
import { successResponse } from '../../../../utils/response.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const {
    usersRepository,
    passwordManager,
    artworksRepository,
    questionsRepository,
    postersRepository,
    statsRepository,
    settingsRepository,
    log,
    config
  } = fastify

  // --- Admin Security Hook ---
  fastify.addHook('onRequest', async (request, reply) => {
    // Bypass authentication check for login endpoint
    const urlPath = request.url.split('?')[0]
    if (request.method === 'POST' && urlPath.endsWith('/admin/auth/login')) {
      return
    }

    try {
      await request.jwtVerify()
      const payload = request.user as { role?: string }
      if (payload.role !== 'admin') {
        return reply.forbidden('Forbidden - Admin access required')
      }
    } catch {
      return reply.unauthorized('Authentication required')
    }
  })

  // --- Helper to require default administrator username "admin888" ---
  const requireDefaultAdmin = async (request: any, reply: any) => {
    const { id } = request.user as { id: number }
    const userResult = await usersRepository.findById(id)
    if (
      userResult.isErr() ||
      !userResult.value ||
      userResult.value.username !== 'admin888'
    ) {
      return reply.forbidden(
        'Forbidden - Only default administrator has access'
      )
    }
  }

  // --- 7.1 Admin Login ---
  fastify.post<{ Body: AdminLoginRequest }>(
    '/auth/login',
    {
      schema: {
        tags: ['V1 Admin'],
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 1 }
          }
        },
        response: {
          200: AdminLoginResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { username, password } = request.body

      const userResult = await usersRepository.findByUsername(username)
      if (userResult.isErr()) {
        log.error(
          `Admin authentication error querying user: ${userResult.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      const user = userResult.value
      if (!user || user.role !== 'admin') {
        return reply.unauthorized('Invalid username or password')
      }

      const isPasswordValid = await passwordManager.compare(
        password,
        user.password
      )
      if (!isPasswordValid) {
        return reply.unauthorized('Invalid username or password')
      }

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role
      })

      return successResponse({
        token,
        username: user.username
      })
    }
  )

  // --- 7.2 Get Console Stats ---
  fastify.get(
    '/dashboard/stats',
    {
      schema: {
        tags: ['V1 Admin'],
        response: {
          200: DashboardStatsResponseSchema
        }
      }
    },
    async (request, reply) => {
      const statsResult = await statsRepository.getDashboardStats()
      if (statsResult.isErr()) {
        log.error(
          `Failed to aggregate console metrics: ${statsResult.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      return successResponse(statsResult.value)
    }
  )

  // --- 7.3 Get Aliyun OSS Upload Signature ---
  fastify.get<{ Querystring: { filename: string; mimeType: string } }>(
    '/media/upload-signature',
    {
      schema: {
        tags: ['V1 Admin'],
        querystring: {
          type: 'object',
          required: ['filename', 'mimeType'],
          properties: {
            filename: { type: 'string', minLength: 1 },
            mimeType: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const { filename, mimeType } = request.query

      // Retrieve dynamic OSS configurations from database
      const dbOssResult = await settingsRepository.getOssSettings()
      let activeConfig = {
        ALIYUN_OSS_ACCESS_KEY_ID: config.ALIYUN_OSS_ACCESS_KEY_ID,
        ALIYUN_OSS_ACCESS_KEY_SECRET: config.ALIYUN_OSS_ACCESS_KEY_SECRET,
        ALIYUN_OSS_BUCKET: config.ALIYUN_OSS_BUCKET,
        ALIYUN_OSS_REGION: config.ALIYUN_OSS_REGION,
        ALIYUN_OSS_HOST: config.ALIYUN_OSS_HOST
      }

      if (dbOssResult.isOk() && dbOssResult.value.accessKeyId) {
        activeConfig = {
          ALIYUN_OSS_ACCESS_KEY_ID: dbOssResult.value.accessKeyId,
          ALIYUN_OSS_ACCESS_KEY_SECRET: dbOssResult.value.accessKeySecret,
          ALIYUN_OSS_BUCKET: dbOssResult.value.bucket,
          ALIYUN_OSS_REGION: dbOssResult.value.region,
          ALIYUN_OSS_HOST: dbOssResult.value.host
        }
      }

      const signature = getOssUploadSignature(filename, mimeType, activeConfig)
      return successResponse(signature)
    }
  )

  // --- 7.4.1 Get PGC Artworks (Paginated) ---
  fastify.get<{ Querystring: AdminArtworksQuery }>(
    '/pgc/artworks',
    {
      schema: {
        tags: ['V1 Admin'],
        querystring: AdminArtworksQuerySchema,
        response: {
          200: AdminArtworksListResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { page = 1, limit = 10, type } = request.query

      const artworksResult = await artworksRepository.findAdminArtworks({
        page,
        pageSize: limit,
        type: type as any
      })

      if (artworksResult.isErr()) {
        log.error(
          `Failed to fetch admin artworks: ${artworksResult.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      const list = artworksResult.value.items.map((art) => ({
        id: art.id,
        type: art.type as 'image' | 'video' | 'audio',
        url: art.url,
        mediaUrl: art.mediaUrl,
        aspectRatio: art.aspectRatio,
        title: art.title,
        createdAt: new Date(art.createdAt * 1000).toISOString()
      }))

      return successResponse({
        list,
        total: artworksResult.value.total
      })
    }
  )

  // --- 7.4.2 Create PGC Artwork ---
  fastify.post<{ Body: CreateArtworkRequest }>(
    '/pgc/artworks',
    {
      schema: {
        tags: ['V1 Admin'],
        body: CreateArtworkRequestSchema,
        response: {
          200: ArtworkMutationResponseSchema
        }
      }
    },
    async (request, reply) => {
      const createResult = await artworksRepository.createArtwork(request.body)
      if (createResult.isErr()) {
        log.error(
          `Failed to create artwork record: ${createResult.error.message}`
        )
        return reply.internalServerError('Failed to save artwork')
      }

      return successResponse(
        {
          id: createResult.value.id,
          type: createResult.value.type as 'image' | 'video' | 'audio',
          title: createResult.value.title
        },
        'created success'
      )
    }
  )

  // --- 7.4.3 Update PGC Artwork ---
  fastify.put<{ Params: { id: number }; Body: UpdateArtworkRequest }>(
    '/pgc/artworks/:id',
    {
      schema: {
        tags: ['V1 Admin'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer', minimum: 1 }
          }
        },
        body: UpdateArtworkRequestSchema
      }
    },
    async (request, reply) => {
      const { id } = request.params

      const existingResult = await artworksRepository.findById(id)
      if (existingResult.isErr() || !existingResult.value) {
        return reply.notFound('Artwork not found')
      }

      const updateResult = await artworksRepository.updateArtwork(
        id,
        request.body
      )
      if (updateResult.isErr()) {
        log.error(`Failed to update artwork: ${updateResult.error.message}`)
        return reply.internalServerError('Failed to update artwork')
      }

      return successResponse(null, 'updated success')
    }
  )

  // --- 7.4.4 Delete PGC Artwork ---
  fastify.delete<{ Params: { id: number } }>(
    '/pgc/artworks/:id',
    {
      schema: {
        tags: ['V1 Admin'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer', minimum: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params

      const existingResult = await artworksRepository.findById(id)
      if (existingResult.isErr() || !existingResult.value) {
        return reply.notFound('Artwork not found')
      }

      const deleteResult = await artworksRepository.softDeleteArtwork(id)
      if (deleteResult.isErr()) {
        log.error(
          `Failed to soft delete artwork: ${deleteResult.error.message}`
        )
        return reply.internalServerError('Failed to delete artwork')
      }

      return successResponse(null, 'deleted success')
    }
  )

  // --- 7.5.1 Get All UGC Question Configuration ---
  fastify.get(
    '/ugc/questions',
    {
      schema: {
        tags: ['V1 Admin'],
        response: {
          200: QuestionsResponseSchema
        }
      }
    },
    async (request, reply) => {
      const result = await questionsRepository.findAllQuestions()
      if (result.isErr()) {
        log.error(
          `Failed to fetch questions configuration: ${result.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      return successResponse({ questions: result.value })
    }
  )

  // --- 7.5.2 Overwrite All UGC Questions ---
  fastify.put<{ Body: SaveQuestionsRequest }>(
    '/ugc/questions',
    {
      schema: {
        tags: ['V1 Admin'],
        body: SaveQuestionsRequestSchema
      }
    },
    async (request, reply) => {
      const { questions } = request.body

      const overwriteResult =
        await questionsRepository.overwriteAllQuestions(questions)
      if (overwriteResult.isErr()) {
        log.error(
          `Failed to overwrite questions: ${overwriteResult.error.message}`
        )
        return reply.internalServerError('Failed to save questions')
      }

      return successResponse(null, 'questions updated successfully')
    }
  )

  // --- 7.6.1 Query User List (Paginated + Optional Nickname search) ---
  fastify.get<{ Querystring: AdminUsersListRequestQuery }>(
    '/users',
    {
      schema: {
        tags: ['V1 Admin'],
        querystring: AdminUsersListRequestQuerySchema,
        response: {
          200: AdminUsersListResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { page = 1, limit = 10, nickname } = request.query

      const usersResult = await usersRepository.findAllUsers({
        page,
        pageSize: limit,
        nickname
      })

      if (usersResult.isErr()) {
        log.error(`Failed to query user records: ${usersResult.error.message}`)
        return reply.internalServerError('Database error')
      }

      const list = usersResult.value.items.map((user) => ({
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        createdAt: new Date(user.created_at * 1000).toISOString()
      }))

      return successResponse({
        list,
        total: usersResult.value.total
      })
    }
  )

  // --- 7.6.2 Query UGC Test Posters list (Paginated + Optional filter) ---
  fastify.get<{ Querystring: AdminPostersQuery }>(
    '/ugc/posters',
    {
      schema: {
        tags: ['V1 Admin'],
        querystring: AdminPostersQuerySchema,
        response: {
          200: AdminPostersResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { page = 1, limit = 10, resultType } = request.query

      const postersResult = await postersRepository.findAllPosters({
        page,
        pageSize: limit,
        resultType
      })

      if (postersResult.isErr()) {
        log.error(
          `Failed to query test posters: ${postersResult.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      const list = postersResult.value.items.map((item) => ({
        posterId: item.posterId,
        resultType: item.resultType,
        resultName: item.resultName,
        user: item.user,
        createdAt: new Date(item.createdAt * 1000).toISOString(),
        status: item.status
      }))

      return successResponse({
        list,
        total: postersResult.value.total
      })
    }
  )

  // --- 7.6.3 Ban/Activate UGC Poster ---
  fastify.put<{ Params: { id: string }; Body: UpdatePosterStatusRequest }>(
    '/ugc/posters/:id/status',
    {
      schema: {
        tags: ['V1 Admin'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        },
        body: UpdatePosterStatusRequestSchema
      }
    },
    async (request, reply) => {
      const { id } = request.params
      const { status } = request.body

      const existingResult = await postersRepository.findById(id)
      if (existingResult.isErr() || !existingResult.value) {
        return reply.notFound('Poster record not found')
      }

      const statusResult = await postersRepository.updateStatus(id, status)
      if (statusResult.isErr()) {
        log.error(
          `Failed to toggle poster status: ${statusResult.error.message}`
        )
        return reply.internalServerError('Failed to update poster status')
      }

      return successResponse(null, 'poster status updated')
    }
  )

  // --- 7.7.1 Update Admin Password ---
  fastify.put<{ Body: UpdateAdminPasswordRequest }>(
    '/auth/password',
    {
      schema: {
        tags: ['V1 Admin'],
        body: UpdateAdminPasswordRequestSchema
      }
    },
    async (request, reply) => {
      const { id: userId, email } = request.user as {
        id: number
        email: string
      }
      const { currentPassword, newPassword } = request.body

      const userResult = await usersRepository.findById(userId)
      if (userResult.isErr() || !userResult.value) {
        return reply.notFound('Admin user not found')
      }

      // Fetch the full user record using findByEmail to access the hashed password field
      const fullUserResult = await usersRepository.findByEmail(email)
      if (fullUserResult.isErr() || !fullUserResult.value) {
        return reply.notFound('Admin user details not found')
      }

      const isPasswordValid = await passwordManager.compare(
        currentPassword,
        fullUserResult.value.password
      )
      if (!isPasswordValid) {
        return reply.unauthorized('Invalid current password')
      }

      const hashedNewPassword = await passwordManager.hash(newPassword)
      const updateResult = await usersRepository.updatePassword(
        email,
        hashedNewPassword
      )
      if (updateResult.isErr()) {
        log.error(
          `Failed to update admin password: ${updateResult.error.message}`
        )
        return reply.internalServerError('Failed to update password')
      }

      return successResponse(null, 'password updated successfully')
    }
  )

  // --- 7.7.2 Create New Admin Account ---
  fastify.post<{ Body: CreateAdminAccountRequest }>(
    '/accounts',
    {
      schema: {
        tags: ['V1 Admin'],
        body: CreateAdminAccountRequestSchema
      },
      preValidation: [requireDefaultAdmin]
    },
    async (request, reply) => {
      const { username, password, email, rootPassword } = request.body

      // Verify root password
      const rootUserResult = await usersRepository.findByUsername('admin888')
      if (rootUserResult.isErr() || !rootUserResult.value) {
        return reply.internalServerError('Failed to fetch default admin')
      }
      const isRootPassValid = await passwordManager.compare(rootPassword, rootUserResult.value.password)
      if (!isRootPassValid) {
        return reply.badRequest('根管理员密码验证失败')
      }

      // Uniqueness check for username
      const existingUserByUsername =
        await usersRepository.findByUsername(username)
      if (existingUserByUsername.isErr()) {
        return reply.internalServerError('Database check failed')
      }
      if (existingUserByUsername.value) {
        return reply.conflict('Username already exists')
      }

      // Uniqueness check for email
      const existingUserByEmail = await usersRepository.findByEmail(email)
      if (existingUserByEmail.isErr()) {
        return reply.internalServerError('Database check failed')
      }
      if (existingUserByEmail.value) {
        return reply.conflict('Email already exists')
      }

      const hashedPassword = await passwordManager.hash(password)
      const createResult = await usersRepository.createUserWithRole({
        email,
        username,
        password: hashedPassword,
        role: 'admin'
      })

      if (createResult.isErr()) {
        console.error('CREATE_ADMIN_ERROR:', createResult.error)
        log.error(
          `Failed to create admin account: ${createResult.error.message}`
        )
        return reply.internalServerError('Failed to create admin account')
      }

      // Query the database to retrieve the newly created admin ID
      const newAdminResult = await usersRepository.findByEmail(email)
      if (newAdminResult.isErr() || !newAdminResult.value) {
        log.error('Failed to retrieve newly created admin user record')
        return reply.internalServerError('Failed to retrieve new admin')
      }

      const newAdmin = newAdminResult.value

      return successResponse(
        { id: newAdmin.id, username: newAdmin.username, email: newAdmin.email },
        'admin account created successfully'
      )
    }
  )

  // --- 7.7.3 Delete Admin Account ---
  fastify.delete<{ Params: { id: number } }>(
    '/accounts/:id',
    {
      schema: {
        tags: ['V1 Admin'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer', minimum: 1 }
          }
        }
      },
      preValidation: [requireDefaultAdmin]
    },
    async (request, reply) => {
      const { id: targetId } = request.params
      const { id: currentAdminId } = request.user as { id: number }

      // Prevent self-deletion
      if (Number(targetId) === Number(currentAdminId)) {
        return reply.badRequest('Cannot delete your own administrator account')
      }

      // Find the user to verify role is admin
      const userResult = await usersRepository.findById(targetId)
      if (userResult.isErr() || !userResult.value) {
        return reply.notFound('Admin account not found')
      }

      if (userResult.value.role !== 'admin') {
        return reply.badRequest('Target user is not an administrator')
      }

      const deleteResult = await usersRepository.softDeleteUser(targetId)
      if (deleteResult.isErr()) {
        log.error(
          `Failed to delete admin account: ${deleteResult.error.message}`
        )
        return reply.internalServerError('Failed to delete admin account')
      }

      return successResponse(null, 'admin account deleted successfully')
    }
  )

  // --- 7.7.4 Get Admin Accounts List (Only Default Admin) ---
  fastify.get(
    '/accounts',
    {
      schema: {
        tags: ['V1 Admin'],
        response: {
          200: AdminAccountsListResponseSchema
        }
      },
      preValidation: [requireDefaultAdmin]
    },
    async (request, reply) => {
      const adminsResult = await usersRepository.findAllAdmins()
      if (adminsResult.isErr()) {
        log.error(`Failed to list admin accounts: ${adminsResult.error.message}`)
        return reply.internalServerError('Database error')
      }

      const list = adminsResult.value.map((admin) => ({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role ?? 'admin',
        createdAt: new Date(admin.created_at * 1000).toISOString()
      }))

      return successResponse({ list })
    }
  )

  // --- 7.7.5 Update Admin Account Details (Only Default Admin) ---
  fastify.put<{ Params: { id: number }; Body: UpdateAdminAccountRequest }>(
    '/accounts/:id',
    {
      schema: {
        tags: ['V1 Admin'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer', minimum: 1 }
          }
        },
        body: UpdateAdminAccountRequestSchema
      },
      preValidation: [requireDefaultAdmin]
    },
    async (request, reply) => {
      const { id } = request.params
      const { username, email, password, rootPassword } = request.body

      // Verify root password
      const rootUserResult = await usersRepository.findByUsername('admin888')
      if (rootUserResult.isErr() || !rootUserResult.value) {
        return reply.internalServerError('Failed to fetch default admin')
      }
      const isRootPassValid = await passwordManager.compare(rootPassword, rootUserResult.value.password)
      if (!isRootPassValid) {
        return reply.badRequest('根管理员密码验证失败')
      }

      const userResult = await usersRepository.findById(id)
      if (userResult.isErr() || !userResult.value) {
        return reply.notFound('Admin account not found')
      }

      if (userResult.value.role !== 'admin') {
        return reply.badRequest('Target user is not an administrator')
      }

      // If username is changing, check uniqueness
      if (username && username !== userResult.value.username) {
        const checkUsername = await usersRepository.findByUsername(username)
        if (checkUsername.isErr()) return reply.internalServerError('Database error')
        if (checkUsername.value) return reply.conflict('Username already exists')
      }

      // If email is changing, check uniqueness
      if (email && email !== userResult.value.email) {
        const checkEmail = await usersRepository.findByEmail(email)
        if (checkEmail.isErr()) return reply.internalServerError('Database error')
        if (checkEmail.value) return reply.conflict('Email already exists')
      }

      const updateData: { username?: string; email?: string; password?: string } = {}
      if (username) updateData.username = username
      if (email) updateData.email = email
      if (password) {
        updateData.password = await passwordManager.hash(password)
      }

      const updateResult = await usersRepository.updateAdmin(id, updateData)
      if (updateResult.isErr()) {
        log.error(`Failed to update admin account: ${updateResult.error.message}`)
        return reply.internalServerError('Failed to update admin')
      }

      return successResponse(null, 'admin account updated successfully')
    }
  )

  // --- 7.8.1 Get Aliyun OSS Settings ---
  fastify.get(
    '/settings/oss',
    {
      schema: {
        tags: ['V1 Admin'],
        response: {
          200: OssSettingsResponseSchema
        }
      },
      preValidation: [requireDefaultAdmin]
    },
    async (request, reply) => {
      const dbOssResult = await settingsRepository.getOssSettings()
      if (dbOssResult.isErr()) {
        log.error(
          `Failed to retrieve OSS settings: ${dbOssResult.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      // If database is empty, fall back to environment variables configuration or mock defaults
      const accessKeyId =
        dbOssResult.value.accessKeyId ||
        config.ALIYUN_OSS_ACCESS_KEY_ID ||
        'mock_access_key_id'
      const accessKeySecret =
        dbOssResult.value.accessKeySecret ||
        config.ALIYUN_OSS_ACCESS_KEY_SECRET ||
        'mock_access_key_secret'
      const bucket =
        dbOssResult.value.bucket ||
        config.ALIYUN_OSS_BUCKET ||
        'litverse-bucket'
      const region =
        dbOssResult.value.region ||
        config.ALIYUN_OSS_REGION ||
        'oss-cn-hangzhou'
      const host =
        dbOssResult.value.host ||
        config.ALIYUN_OSS_HOST ||
        `https://${bucket}.${region}.aliyuncs.com`

      return successResponse({
        accessKeyId,
        accessKeySecret,
        bucket,
        region,
        host
      })
    }
  )

  // --- 7.8.2 Set Aliyun OSS Settings ---
  fastify.put<{ Body: OssSettingsRequest }>(
    '/settings/oss',
    {
      schema: {
        tags: ['V1 Admin'],
        body: OssSettingsRequestSchema
      },
      preValidation: [requireDefaultAdmin]
    },
    async (request, reply) => {
      const { accessKeyId, accessKeySecret, bucket, region, host } =
        request.body

      const updateResult = await settingsRepository.setOssSettings({
        accessKeyId,
        accessKeySecret,
        bucket,
        region,
        host
      })

      if (updateResult.isErr()) {
        log.error(
          `Failed to update OSS settings in database: ${updateResult.error.message}`
        )
        return reply.internalServerError('Failed to save OSS settings')
      }

      return successResponse(null, 'OSS settings updated successfully')
    }
  )
}

export default plugin
