import assert from 'node:assert'
import { describe, it } from 'node:test'
import { build } from '../helper.js'

describe('V1 Litverse API Integration Tests', () => {
  
  // --- Auth & User ---
  describe('POST /api/v1/auth/mp-login', () => {
    it('successfully logs in or registers WeChat user with code', async (t) => {
      const app = await build(t)
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mp-login',
        payload: { code: 'test_code_123' }
      })

      assert.strictEqual(res.statusCode, 200)
      const body = JSON.parse(res.payload)
      assert.strictEqual(body.code, 0)
      assert.ok(body.data.token)
      assert.strictEqual(body.data.user.nickname, '微信用户')
      assert.ok(body.data.user.openid.includes('test_code_123'))
    })
  })

  describe('GET /api/v1/user/info & PUT /api/v1/user/profile', () => {
    it('returns unauthorized when requesting without token', async (t) => {
      const app = await build(t)
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/user/info'
      })
      assert.strictEqual(res.statusCode, 401)
      const body = JSON.parse(res.payload)
      assert.strictEqual(body.code, 40100)
    })

    it('retrieves user profile and updates it successfully when authenticated', async (t) => {
      const app = await build(t)
      
      // Perform mp-login to get user token
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mp-login',
        payload: { code: 'user_profile_test_code' }
      })
      const { token, user } = JSON.parse(loginRes.payload).data

      // Get Profile
      const infoRes = await app.inject({
        method: 'GET',
        url: '/api/v1/user/info',
        headers: { Authorization: `Bearer ${token}` }
      })
      assert.strictEqual(infoRes.statusCode, 200)
      const infoBody = JSON.parse(infoRes.payload)
      assert.strictEqual(infoBody.code, 0)
      assert.strictEqual(infoBody.data.id, user.id)

      // Update Profile
      const updateRes = await app.inject({
        method: 'PUT',
        url: '/api/v1/user/profile',
        headers: { Authorization: `Bearer ${token}` },
        payload: {
          nickname: 'New Nickname',
          avatarUrl: 'https://example.com/avatar.jpg'
        }
      })
      assert.strictEqual(updateRes.statusCode, 200)
      const updateBody = JSON.parse(updateRes.payload)
      assert.strictEqual(updateBody.code, 0)
      assert.strictEqual(updateBody.data.nickname, 'New Nickname')

      // Get Profile again to confirm update
      const infoRes2 = await app.inject({
        method: 'GET',
        url: '/api/v1/user/info',
        headers: { Authorization: `Bearer ${token}` }
      })
      const infoBody2 = JSON.parse(infoRes2.payload)
      assert.strictEqual(infoBody2.data.nickname, 'New Nickname')
      assert.strictEqual(infoBody2.data.avatarUrl, 'https://example.com/avatar.jpg')
    })
  })

  // --- PGC Artworks ---
  describe('GET /api/v1/pgc/artworks', () => {
    it('returns empty list if no artworks exist', async (t) => {
      const app = await build(t)
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/pgc/artworks'
      })
      assert.strictEqual(res.statusCode, 200)
      const body = JSON.parse(res.payload)
      assert.strictEqual(body.code, 0)
      assert.ok(Array.isArray(body.data.list))
    })
  })

  // --- UGC Questions & Posters ---
  describe('UGC Questions & Posters Flow', () => {
    it('handles question retrieval, poster submission, details and history', async (t) => {
      const app = await build(t)

      // 1. Get Questions
      const questionsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/ugc/questions'
      })
      assert.strictEqual(questionsRes.statusCode, 200)
      const qBody = JSON.parse(questionsRes.payload)
      assert.strictEqual(qBody.code, 0)
      assert.ok(Array.isArray(qBody.data.questions))

      // 2. Submit Poster as guest
      const posterRes = await app.inject({
        method: 'POST',
        url: '/api/v1/ugc/posters',
        payload: {
          answers: [1, 2, 3],
          resultType: 2,
          resultName: '地摊儿纪实大师'
        }
      })
      assert.strictEqual(posterRes.statusCode, 200)
      const pBody = JSON.parse(posterRes.payload)
      assert.strictEqual(pBody.code, 0)
      const posterId = pBody.data.posterId
      assert.ok(posterId.startsWith('post_'))

      // 3. Get Poster Detail
      const detailRes = await app.inject({
        method: 'GET',
        url: `/api/v1/ugc/posters/${posterId}`
      })
      assert.strictEqual(detailRes.statusCode, 200)
      const dBody = JSON.parse(detailRes.payload)
      assert.strictEqual(dBody.code, 0)
      assert.strictEqual(dBody.data.posterId, posterId)
      assert.strictEqual(dBody.data.resultName, '地摊儿纪实大师')
      assert.strictEqual(dBody.data.user, null) // Guest submission

      // 4. Submit Poster as registered user and fetch history
      const uniqueCode = `history_test_user_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mp-login',
        payload: { code: uniqueCode }
      })
      const { token } = JSON.parse(loginRes.payload).data

      const userPosterRes = await app.inject({
        method: 'POST',
        url: '/api/v1/ugc/posters',
        headers: { Authorization: `Bearer ${token}` },
        payload: {
          answers: [3, 2, 1],
          resultType: 3,
          resultName: '星际漫游思想者'
        }
      })
      assert.strictEqual(userPosterRes.statusCode, 200)

      // Fetch user history
      const historyRes = await app.inject({
        method: 'GET',
        url: '/api/v1/ugc/users/posters',
        headers: { Authorization: `Bearer ${token}` }
      })
      assert.strictEqual(historyRes.statusCode, 200)
      const hBody = JSON.parse(historyRes.payload)
      assert.strictEqual(hBody.code, 0)
      assert.strictEqual(hBody.data.total, 1)
      assert.strictEqual(hBody.data.list[0].resultName, '星际漫游思想者')
    })
  })

  // --- WeChat Sun Code ---
  describe('GET /api/v1/wechat/qrcode', () => {
    it('returns direct image file stream', async (t) => {
      const app = await build(t)
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/wechat/qrcode?path=pages/index/index&scene=posterId=post_123'
      })
      assert.strictEqual(res.statusCode, 200)
      assert.strictEqual(res.headers['content-type'], 'image/png')
      assert.ok(res.rawPayload.length > 50) // Valid PNG buffer size
    })
  })

  // --- Click Analytics ---
  describe('POST /api/v1/stats/track', () => {
    it('tracks clicks successfully', async (t) => {
      const app = await build(t)
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/stats/track',
        payload: {
          event: 'click_buy_ticket',
          platform: 'mp-wechat',
          source: 'home_footer'
        }
      })
      assert.strictEqual(res.statusCode, 200)
      const body = JSON.parse(res.payload)
      assert.strictEqual(body.code, 0)
      assert.strictEqual(body.message, 'tracked')
    })
  })

  // --- Admin API Suite ---
  describe('Admin Endpoints', () => {
    it('denies access to non-admins and handles admin actions', async (t) => {
      const app = await build(t)

      // 1. Attempt admin stats without token
      const badStats = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/dashboard/stats'
      })
      assert.strictEqual(badStats.statusCode, 401)

      // 2. Attempt admin stats with standard user token
      const userLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mp-login',
        payload: { code: 'admin_test_normal_user' }
      })
      const userToken = JSON.parse(userLogin.payload).data.token
      const forbiddenStats = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/dashboard/stats',
        headers: { Authorization: `Bearer ${userToken}` }
      })
      assert.strictEqual(forbiddenStats.statusCode, 403)

      // 3. Admin login successfully
      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: {
          username: 'admin888',
          password: 'admin888'
        }
      })
      assert.strictEqual(adminLogin.statusCode, 200)
      const adminToken = JSON.parse(adminLogin.payload).data.token
      assert.ok(adminToken)

      // 4. Retrieve dashboard stats with admin token
      const statsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/dashboard/stats',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.strictEqual(statsRes.statusCode, 200)
      const stats = JSON.parse(statsRes.payload).data
      assert.ok(stats.totals)
      assert.ok(Array.isArray(stats.personalityDistribution))
      assert.ok(Array.isArray(stats.ticketClicksTrend.dates))

      // 5. Generate OSS Upload Signature
      const ossRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/media/upload-signature?filename=video.mp4&mimeType=video/mp4',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.strictEqual(ossRes.statusCode, 200)
      const ossData = JSON.parse(ossRes.payload).data
      assert.strictEqual(ossData.dir, 'media/')
      assert.ok(ossData.formData.Signature)

      // 6. Question configurations write/read
      const saveQuestions = await app.inject({
        method: 'PUT',
        url: '/api/v1/admin/ugc/questions',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          questions: [
            {
              id: 1,
              text: '电影是一场梦？',
              options: [
                { label: '赛博都市', value: 'A', weight: 1 },
                { label: '旧时光', value: 'B', weight: 2 }
              ]
            }
          ]
        }
      })
      assert.strictEqual(saveQuestions.statusCode, 200)

      // Read admin questions to verify
      const readQuestions = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/ugc/questions',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.strictEqual(readQuestions.statusCode, 200)
      const qData = JSON.parse(readQuestions.payload).data
      assert.strictEqual(qData.questions[0].text, '电影是一场梦？')
      assert.strictEqual(qData.questions[0].options[0].label, '赛博都市')

      // 7. PGC Artwork CRUD
      const createArt = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/pgc/artworks',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          type: 'video',
          title: '午夜霓虹',
          url: 'https://example.com/poster.jpg',
          mediaUrl: 'https://example.com/video.mp4',
          aspectRatio: 1.7778
        }
      })
      assert.strictEqual(createArt.statusCode, 200)
      const artId = JSON.parse(createArt.payload).data.id

      // Update PGC Artwork
      const updateArt = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/pgc/artworks/${artId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          title: '午夜霓虹 (新标题)'
        }
      })
      assert.strictEqual(updateArt.statusCode, 200)

      // Read admin artworks
      const adminArtworksList = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/pgc/artworks',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.strictEqual(adminArtworksList.statusCode, 200)
      const artListData = JSON.parse(adminArtworksList.payload).data
      assert.strictEqual(artListData.list[0].title, '午夜霓虹 (新标题)')

      // Delete PGC Artwork
      const deleteArt = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/pgc/artworks/${artId}`,
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.strictEqual(deleteArt.statusCode, 200)

      // 8. Users List querying
      const userList = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users?page=1&limit=5',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.strictEqual(userList.statusCode, 200)
      const usersData = JSON.parse(userList.payload).data
      assert.ok(usersData.list.length >= 1)

      // 9. Poster Banning
      const guestPoster = await app.inject({
        method: 'POST',
        url: '/api/v1/ugc/posters',
        payload: {
          answers: [1, 2],
          resultType: 1,
          resultName: '浪漫派'
        }
      })
      const guestPosterId = JSON.parse(guestPoster.payload).data.posterId

      // Ban Poster
      const banPoster = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/ugc/posters/${guestPosterId}/status`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { status: 'banned' }
      })
      assert.strictEqual(banPoster.statusCode, 200)

      // Detail should return 404 now that it's banned
      const posterDetail = await app.inject({
        method: 'GET',
        url: `/api/v1/ugc/posters/${guestPosterId}`
      })
      assert.strictEqual(posterDetail.statusCode, 404)

      // 10. Admin Accounts Management CRUD
      // 10.1 Create new admin account
      const rand = Date.now()
      const subAdminUser = `admin888_sub_${rand}`
      const subAdminEmail = `admin888_sub_${rand}@example.com`

      const createAdminRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/accounts',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          username: subAdminUser,
          password: 'Password123$',
          email: subAdminEmail,
          rootPassword: 'admin888'
        }
      })
      assert.strictEqual(createAdminRes.statusCode, 200)
      const newAdminData = JSON.parse(createAdminRes.payload).data
      assert.ok(newAdminData.id)

      // Test validation logic: root password invalid
      const createBadRootPassRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/accounts',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          username: `rand_usr_bad_${rand}`,
          password: 'Password123$',
          email: `rand_usr_bad_${rand}@example.com`,
          rootPassword: 'wrong_root_password'
        }
      })
      assert.strictEqual(createBadRootPassRes.statusCode, 400)

      // Test validation logic: username conflict
      const createConflictRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/accounts',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          username: subAdminUser,
          password: 'Password123$',
          email: `admin888_sub2_${rand}@example.com`,
          rootPassword: 'admin888'
        }
      })
      assert.strictEqual(createConflictRes.statusCode, 409)

      // 10.2 Verify new admin can log in
      const newAdminLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: {
          username: subAdminUser,
          password: 'Password123$'
        }
      })
      assert.strictEqual(newAdminLogin.statusCode, 200)
      const newAdminToken = JSON.parse(newAdminLogin.payload).data.token

      // 10.3 Modify password for the new admin
      const modifyPasswordRes = await app.inject({
        method: 'PUT',
        url: '/api/v1/admin/auth/password',
        headers: { Authorization: `Bearer ${newAdminToken}` },
        payload: {
          currentPassword: 'Password123$',
          newPassword: 'NewPassword123$'
        }
      })
      assert.strictEqual(modifyPasswordRes.statusCode, 200)

      // Verify log in with old password fails
      const loginFailOld = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: {
          username: subAdminUser,
          password: 'Password123$'
        }
      })
      assert.strictEqual(loginFailOld.statusCode, 401)

      // Verify log in with new password succeeds
      const loginSucceedNew = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: {
          username: subAdminUser,
          password: 'NewPassword123$'
        }
      })
      assert.strictEqual(loginSucceedNew.statusCode, 200)

      // 10.4 Prevent self-deletion
      const getAdminsList = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/accounts',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      const adminList = JSON.parse(getAdminsList.payload).data.list
      const admin888Account = adminList.find((a: any) => a.username === 'admin888')
      assert.ok(admin888Account)

      const deleteSelfRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/accounts/${admin888Account.id}`,
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.strictEqual(deleteSelfRes.statusCode, 400)

      // 10.5 Delete admin account using the main admin token
      const deleteAdminRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/accounts/${newAdminData.id}`,
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.strictEqual(deleteAdminRes.statusCode, 200)

      // Verify deleted admin cannot log in anymore
      const loginFailDeleted = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: {
          username: subAdminUser,
          password: 'NewPassword123$'
        }
      })
      assert.strictEqual(loginFailDeleted.statusCode, 401)

      // 10.6 Enforce requireDefaultAdmin checks for other administrators
      const activeSubAdminUser = `admin888_active_sub_${rand}`
      const activeSubAdminEmail = `admin888_active_sub_${rand}@example.com`
      const createActiveSubRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/accounts',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          username: activeSubAdminUser,
          password: 'Password123$',
          email: activeSubAdminEmail,
          rootPassword: 'admin888'
        }
      })
      assert.strictEqual(createActiveSubRes.statusCode, 200)
      const activeSubData = JSON.parse(createActiveSubRes.payload).data

      const activeSubLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: {
          username: activeSubAdminUser,
          password: 'Password123$'
        }
      })
      const activeSubToken = JSON.parse(activeSubLogin.payload).data.token

      // Attempt to access list admins with non-default admin token -> should fail with 403
      const listAdminsForbidden = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/accounts',
        headers: { Authorization: `Bearer ${activeSubToken}` }
      })
      assert.strictEqual(listAdminsForbidden.statusCode, 403)

      // Attempt to create a new admin with non-default admin token -> should fail with 403
      const createAdminForbidden = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/accounts',
        headers: { Authorization: `Bearer ${activeSubToken}` },
        payload: {
          username: `rand_usr_${rand}`,
          password: 'Password123$',
          email: `rand_usr_${rand}@example.com`
        }
      })
      assert.strictEqual(createAdminForbidden.statusCode, 403)

      // Attempt to delete an admin with non-default admin token -> should fail with 403
      const deleteAdminForbidden = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/accounts/${activeSubData.id}`,
        headers: { Authorization: `Bearer ${activeSubToken}` }
      })
      assert.strictEqual(deleteAdminForbidden.statusCode, 403)

      // Attempt to update an admin with non-default admin token -> should fail with 403
      const updateAdminForbidden = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/accounts/${activeSubData.id}`,
        headers: { Authorization: `Bearer ${activeSubToken}` },
        payload: {
          username: `new_name_${rand}`
        }
      })
      assert.strictEqual(updateAdminForbidden.statusCode, 403)

      // Default admin updates activeSub details (username and email)
      const updatedSubUsername = `admin888_active_sub_upd_${rand}`
      const updatedSubEmail = `admin888_active_sub_upd_${rand}@example.com`
      const updateSubRes = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/accounts/${activeSubData.id}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          username: updatedSubUsername,
          email: updatedSubEmail,
          password: 'NewPassword321$',
          rootPassword: 'admin888'
        }
      })
      assert.strictEqual(updateSubRes.statusCode, 200)

      // Confirm updating worked by logging in with new credentials
      const updatedSubLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: {
          username: updatedSubUsername,
          password: 'NewPassword321$'
        }
      })
      assert.strictEqual(updatedSubLogin.statusCode, 200)

      // List all administrators using default admin token and verify details are updated
      const listAdminsSucceed = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/accounts',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.strictEqual(listAdminsSucceed.statusCode, 200)
      const finalAdminsList = JSON.parse(listAdminsSucceed.payload).data.list
      const foundUpdatedSub = finalAdminsList.find((a: any) => a.id === activeSubData.id)
      assert.ok(foundUpdatedSub)
      assert.strictEqual(foundUpdatedSub.username, updatedSubUsername)
      assert.strictEqual(foundUpdatedSub.email, updatedSubEmail)

      // Verify that sub-admin cannot get OSS settings
      const getOssForbidden = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/settings/oss',
        headers: { Authorization: `Bearer ${activeSubToken}` }
      })
      assert.strictEqual(getOssForbidden.statusCode, 403)

      // Verify that sub-admin cannot update OSS settings
      const updateOssForbidden = await app.inject({
        method: 'PUT',
        url: '/api/v1/admin/settings/oss',
        headers: { Authorization: `Bearer ${activeSubToken}` },
        payload: {
          accessKeyId: 'forbidden_id',
          accessKeySecret: 'forbidden_secret',
          bucket: 'forbidden-bucket',
          region: 'oss-cn-beijing',
          host: 'https://forbidden-bucket.oss-cn-beijing.aliyuncs.com'
        }
      })
      assert.strictEqual(updateOssForbidden.statusCode, 403)

      // Clean up the active sub admin
      const deleteActiveSubRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/accounts/${activeSubData.id}`,
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.strictEqual(deleteActiveSubRes.statusCode, 200)

      // 11. Aliyun OSS Dynamic Configuration Settings
      // 11.1 Get default settings (should fall back to mock environment configuration values)
      const getOssRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/settings/oss',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.strictEqual(getOssRes.statusCode, 200)
      const defaultOss = JSON.parse(getOssRes.payload).data
      assert.ok(defaultOss.bucket)

      // 11.2 Update settings in database
      const updateOssRes = await app.inject({
        method: 'PUT',
        url: '/api/v1/admin/settings/oss',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          accessKeyId: 'dyn_id_abc',
          accessKeySecret: 'dyn_secret_xyz',
          bucket: 'dynamic-test-bucket',
          region: 'oss-cn-beijing',
          host: 'https://dynamic-test-bucket.oss-cn-beijing.aliyuncs.com'
        }
      })
      assert.strictEqual(updateOssRes.statusCode, 200)

      // 11.3 Retrieve updated settings and verify
      const getUpdatedOssRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/settings/oss',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.strictEqual(getUpdatedOssRes.statusCode, 200)
      const updatedOss = JSON.parse(getUpdatedOssRes.payload).data
      assert.strictEqual(updatedOss.accessKeyId, 'dyn_id_abc')
      assert.strictEqual(updatedOss.bucket, 'dynamic-test-bucket')

      // 11.4 Get OSS signature and verify it uses the newly configured dynamic values
      const sigRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/media/upload-signature?filename=doc.pdf&mimeType=application/pdf',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.strictEqual(sigRes.statusCode, 200)
      const sigData = JSON.parse(sigRes.payload).data
      assert.strictEqual(
        sigData.host,
        'https://dynamic-test-bucket.oss-cn-beijing.aliyuncs.com'
      )
      assert.strictEqual(sigData.formData.OSSAccessKeyId, 'dyn_id_abc')
    })
  })
})

