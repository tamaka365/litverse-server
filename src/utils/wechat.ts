import { Buffer } from 'node:buffer'

/**
 * A simple 64x64 transparent PNG image used as a fallback mock QR Code.
 */
const MOCK_QR_CODE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYJ1FAAAAWklEQVR42u3PMQ0AAAgDMO5fMhrwcBqQrYF0JnDqZ7m8AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAj4F9gwq+Uv9q3oAAAAASUVORK5CYII='

export interface WechatConfig {
  WECHAT_APPID?: string
  WECHAT_SECRET?: string
}

/**
 * Fetches the WeChat Mini Program QR Code (Sun Code) for the given path and scene.
 * If credentials are missing or the WeChat API fails, it falls back to a mock PNG buffer.
 */
export async function getWechatMiniProgramQrCode(
  path: string,
  scene: string,
  config: WechatConfig
): Promise<Buffer> {
  const appId = config.WECHAT_APPID
  const secret = config.WECHAT_SECRET

  // Fallback to mock if credentials are not configured
  if (!appId || !secret) {
    return Buffer.from(MOCK_QR_CODE_BASE64, 'base64')
  }

  try {
    // 1. Fetch access token
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`
    const tokenRes = await fetch(tokenUrl)
    if (!tokenRes.ok) {
      throw new Error(
        `Failed to fetch WeChat access token, HTTP status: ${tokenRes.status}`
      )
    }

    const tokenData = (await tokenRes.json()) as {
      access_token?: string
      errcode?: number
      errmsg?: string
    }
    if (!tokenData.access_token) {
      throw new Error(
        `WeChat access token error: ${tokenData.errmsg || 'Unknown error'}`
      )
    }

    // 2. Fetch mini program code (getwxacodeunlimit)
    const codeUrl = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${tokenData.access_token}`
    const codeRes = await fetch(codeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        scene,
        page: path,
        check_path: false,
        env_version: 'release'
      })
    })

    if (!codeRes.ok) {
      throw new Error(`WeChat QR Code API HTTP status: ${codeRes.status}`)
    }

    const contentType = codeRes.headers.get('content-type') || ''

    // If WeChat returns JSON, it means there is an error
    if (contentType.includes('application/json')) {
      const errJson = (await codeRes.json()) as {
        errcode?: number
        errmsg?: string
      }
      throw new Error(
        `WeChat QR Code generation failed: ${errJson.errmsg || 'Unknown error'}`
      )
    }

    const arrayBuffer = await codeRes.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.warn('WeChat API call failed, falling back to mock QR code:', error)
    return Buffer.from(MOCK_QR_CODE_BASE64, 'base64')
  }
}
