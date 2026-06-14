# 地摊文学宇宙 (Litverse) 后端 API 接口文档

本文档为「地摊儿文学宇宙」项目的后端服务 API 规范。旨在指导后续的后端项目开发，以便前端（Taro 小程序/H5）与后端进行无缝对接。

---

## 1. 全局设计规范

### 1.1 基础配置与媒体存储
- **Base URL**: `/api/v1`
- **Content-Type**: `application/json; charset=utf-8`
- **媒体存储托管 (阿里云 OSS)**:
  - 所有的 PGC 作品资源（大图、视频源、音频源、封面等）与 UGC 生成的数据均持久化存储于**阿里云对象存储 OSS**。
  - 前端和管理后台不通过后端应用服务器中转上传大文件，而是通过后端提供的签名接口直接上传到阿里云 OSS。
  - 前端加载媒体资源时，统一从阿里云 OSS 域名（或绑定的自定义 CDN 域名，如 `https://oss-media.litverse.com`）拉取，保障高并发下的流媒体播放体验。

### 1.2 鉴权机制
- 采用 **JWT (JSON Web Token)** 进行接口鉴权。
- 登录成功后，后端返回 `token`。
- 前端请求时需在 HTTP Header 中携带：
  ```http
  Authorization: Bearer <your_jwt_token>
  ```
- 部分公开接口（如获取画廊列表、获取题库等）无需携带 Token。

### 1.3 统一响应格式
所有接口均返回统一的 JSON 结构：
```json
{
  "code": 0,          // 0 表示成功，非 0 表示特定错误码
  "message": "success",// 提示信息
  "data": {}          // 具体的业务数据，可为对象、数组或 null
}
```

常见状态码定义：
- `0`: 成功 (Success)
- `40001`: 参数校验失败 (Invalid Parameters)
- `40003`: 微信接口调用失败 (Wechat API Error)
- `40100`: 未登录或 Token 已过期 (Unauthorized)
- `40300`: 权限不足 (Forbidden)
- `50000`: 服务器内部错误 (Internal Server Error)

---

## 2. 用户与授权模块 (Auth & User)

### 2.1 微信小程序快捷登录
用于微信小程序端的一键登录与账号创建。

- **接口地址**: `POST /auth/mp-login`
- **鉴权要求**: 无（公开接口）
- **请求参数**:
  ```json
  {
    "code": "031xxxxxx" // 微信 wx.login 临时凭证
  }
  ```
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 10086,
        "openid": "o3X_-5xxxxx",
        "nickname": "微信用户",
        "avatarUrl": "https://thirdwx.qlogo.cn/.../0"
      }
    }
  }
  ```

### 2.2 获取当前用户信息
- **接口地址**: `GET /user/info`
- **鉴权要求**: 需要 Token
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "id": 10086,
      "nickname": "浪漫独行客",
      "avatarUrl": "https://example.com/avatar.png",
      "createdAt": "2026-06-12T12:00:00Z"
    }
  }
  ```

### 2.3 更新用户信息
用于微信小程序端获取最新的昵称和头像后上报更新。

- **接口地址**: `PUT /user/profile`
- **鉴权要求**: 需要 Token
- **请求参数**:
  ```json
  {
    "nickname": "独行电影人",
    "avatarUrl": "https://example.com/new-avatar.png"
  }
  ```
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "profile updated",
    "data": {
      "id": 10086,
      "nickname": "独行电影人",
      "avatarUrl": "https://example.com/new-avatar.png"
    }
  }
  ```

---

## 3. PGC 环幕画廊模块 (3D Gallery & Artworks)

根据前端 `ThreeDGallery` 组件的需求，画廊包含 3 行多列的环幕图片/音视频墙。需要后端动态下发作品列表。

### 3.1 获取艺术画廊作品列表
- **接口地址**: `GET /pgc/artworks`
- **鉴权要求**: 无（公开接口）
- **请求参数**:
  | 参数名 | 类型 | 是否必填 | 说明 |
  | :--- | :--- | :--- | :--- |
  | type | string | 否 | 媒介类型过滤：`image`, `video`, `audio` |
  | limit | int | 否 | 获取数量，默认 24 |

- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "list": [
        {
          "id": 1,
          "type": "image",
          "url": "https://litverse-bucket.oss-cn-hangzhou.aliyuncs.com/media/artwork_cover_1.jpg", // OSS 存储的封面大图
          "title": "视觉艺术 #1",
          "mediaUrl": "" // 图片类型为空，或大图地址
        },
        {
          "id": 2,
          "type": "video",
          "url": "https://litverse-bucket.oss-cn-hangzhou.aliyuncs.com/media/video_poster_2.jpg", // 视频封面图
          "mediaUrl": "https://litverse-bucket.oss-cn-hangzhou.aliyuncs.com/media/sample_video_2.mp4", // 视频播放源
          "aspectRatio": 1.7778, // 宽高比，如 16/9
          "title": "影像作品 #2 (横屏)"
        },
        {
          "id": 3,
          "type": "audio",
          "url": "https://litverse-bucket.oss-cn-hangzhou.aliyuncs.com/media/audio_cover_3.jpg", // 音频封面
          "mediaUrl": "https://litverse-bucket.oss-cn-hangzhou.aliyuncs.com/media/sample_audio_3.mp3", // 音频播放源
          "title": "独立音乐 #3"
        }
      ]
    }
  }
  ```

> [!NOTE]
> 前端会根据返回的作品总数，动态计算 3D 环幕中卡片的列数（`columns = Math.ceil(list.length / 3)`），并自动渲染成圆柱体。后端至少需要返回 12 个以上的作品，以获得最佳的 3D 环幕展示曲率。所有的资源链接需指向阿里云 OSS 的公网读取域名（或绑定的自定义 CDN 域名）。

---

## 4. UGC 互动测试与海报模块 (Quiz & UGC Poster)

支撑「文学人格测试」游戏及海报渲染的后端模块。

### 4.1 获取答题测试题库
支持后台动态配置测试题目，便于运营期调整选题。

- **接口地址**: `GET /ugc/questions`
- **鉴权要求**: 无（公开接口）
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "questions": [
        {
          "id": 1,
          "text": "如果电影是一场梦，你希望它是？",
          "options": [
            { "label": "霓虹闪烁的赛博都市", "value": "A", "weight": 1 },
            { "label": "斑驳旧时光里的弄堂", "value": "B", "weight": 2 },
            { "label": "无垠深空的孤独远航", "value": "C", "weight": 3 }
          ]
        },
        {
          "id": 2,
          "text": "在故事的转角，你会遇到？",
          "options": [
            { "label": "一个撑伞的陌生人", "value": "A", "weight": 1 },
            { "label": "一只会说话的黑猫", "value": "B", "weight": 2 },
            { "label": "一封来自未来的信", "value": "C", "weight": 3 }
          ]
        }
      ]
    }
  }
  ```

### 4.2 提交答题结果并生成海报记录
用户做完所有题目后，前端将选择的选项及测试出的人格类型提交至后端进行存档，并生成唯一的分享海报 ID。

- **接口地址**: `POST /ugc/posters`
- **鉴权要求**: 可选（若携带 Token 则关联到该用户，不携带则作为游客记录）
- **请求参数**:
  ```json
  {
    "answers": [1, 2, 2, 1, 3, 2], // 用户各题选择的权重列表
    "resultType": 2,                 // 最终测试人格类型：1-浪漫派, 2-现实派, 3-幻想派
    "resultName": "地摊儿纪实大师"    // 人格名称
  }
  ```
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "posterId": "post_77283624",
      "shareUrl": "https://litverse.com/h5/share/post_77283624", // 供H5端分享的页面链接
      "createdAt": "2026-06-14T15:00:00Z"
    }
  }
  ```

### 4.3 获取海报记录详情
用于他人点击分享链接后进入的分享展示页。

- **接口地址**: `GET /ugc/posters/:id`
- **鉴权要求**: 无（公开接口）
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "posterId": "post_77283624",
      "resultType": 2,
      "resultName": "地摊儿纪实大师",
      "user": {
        "nickname": "浪漫独行客",
        "avatarUrl": "https://example.com/avatar.png"
      },
      "createdAt": "2026-06-14T15:00:00Z"
    }
  }
  ```

### 4.4 获取用户测试海报历史
用户在“个人中心”或测试历史页查看自己过往生成的文学人格海报。

- **接口地址**: `GET /ugc/users/posters`
- **鉴权要求**: 需要 Token
- **请求参数**:
  | 参数名 | 类型 | 是否必填 | 说明 |
  | :--- | :--- | :--- | :--- |
  | page | int | 否 | 页码，默认 1 |
  | limit | int | 否 | 每页数量，默认 10 |

- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "list": [
        {
          "posterId": "post_77283624",
          "resultType": 2,
          "resultName": "地摊儿纪实大师",
          "createdAt": "2026-06-14T15:00:00Z"
        }
      ],
      "total": 1
    }
  }
  ```

---

## 5. 微信特有服务模块 (Wechat Shared Services)

### 5.1 获取专属小程序分享码
前端在 Canvas 渲染海报时，需要获取一个唯一指向该海报详情页 (`/pages/ugc/detail?id=xxx`) 的小程序太阳码。由于微信限制，该码需由后端生成。

- **接口地址**: `GET /wechat/qrcode`
- **鉴权要求**: 无（可限制频次）
- **请求参数**:
  | 参数名 | 类型 | 是否必填 | 说明 |
  | :--- | :--- | :--- | :--- |
  | path | string | 是 | 扫码后跳转的小程序页面路径，例如 `pages/index/index` |
  | scene | string | 是 | 携带的参数，如海报ID `posterId=post_77283624` |

- **响应数据**:
  - **形式一 (推荐)**: 直接返回生成的图片文件流 (MIME: `image/png`)。
  - **形式二**: 返回带有 CDN 链接 of JSON：
    ```json
    {
      "code": 0,
      "message": "success",
      "data": {
        "qrCodeUrl": "https://cdn.litverse.com/qrcodes/mp_post_77283624.png"
      }
    }
    ```

---

## 6. 数据分析统计模块 (Statistics)

用于追踪推广点击与测试参与度，评估地摊文学宇宙营销效果。

### 6.1 购票/跳转大麦小程序点击统计
统计有多少用户通过入口页底部「立即购票」按钮点击跳转到了大麦小程序。

- **接口地址**: `POST /stats/track`
- **鉴权要求**: 可选
- **请求参数**:
  ```json
  {
    "event": "click_buy_ticket", // 事件名称
    "platform": "mp-wechat",      // 平台：'mp-wechat'（微信小程序） 或 'h5'
    "source": "home_footer"       // 点击来源位置
  }
  ```
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "tracked"
  }
  ```

---

## 7. 管理后台专属接口 (Admin APIs)

管理后台的所有接口（除了登录外）都需要在 Header 中携带管理员 Token 进行鉴权：
```http
Authorization: Bearer <your_admin_jwt_token>
```

### 7.1 管理员登录
- **接口地址**: `POST /admin/auth/login`
- **鉴权要求**: 无（公开接口）
- **请求参数**:
  ```json
  {
    "username": "admin",
    "password": "securepassword123"
  }
  ```
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin...",
      "username": "admin"
    }
  }
  ```

### 7.2 获取控制台统计指标
- **接口地址**: `GET /admin/dashboard/stats`
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "totals": {
        "userCount": 2840,         // 累计注册用户
        "posterCount": 5120,       // 累计生成海报
        "ticketClickCount": 980    // 累计购票点击
      },
      "personalityDistribution": [ // 人格倾向分布
        { "name": "浪漫主义独行侠", "value": 1200 },
        { "name": "地摊儿纪实大师", "value": 2420 },
        { "name": "星际漫游思想者", "value": 1500 }
      ],
      "ticketClicksTrend": {      // 近 7 日购票点击趋势
        "dates": ["06-08", "06-09", "06-10", "06-11", "06-12", "06-13", "06-14"],
        "values": [80, 110, 95, 140, 160, 210, 185]
      }
    }
  }
  ```

### 7.3 获取阿里云 OSS 直传签名
后台上传大规格视频/音频作品时，客户端先调用此接口向后端获取临时安全上传签名，然后再通过 HTML 表单直传到阿里云 OSS。

- **接口地址**: `GET /admin/media/upload-signature`
- **请求参数**:
  | 参数名 | 类型 | 是否必填 | 说明 |
  | :--- | :--- | :--- | :--- |
  | filename | string | 是 | 原始文件名，用于后缀提取 |
  | mimeType | string | 是 | 文件媒体类型，如 `video/mp4`, `image/jpeg` |

- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "host": "https://litverse-bucket.oss-cn-hangzhou.aliyuncs.com", // OSS Bucket 原生域名或绑定的自定义 CDN 加速域名
      "dir": "media/",
      "formData": {
        "key": "media/172836_myvideo.mp4", // OSS 最终存储的路径文件名
        "OSSAccessKeyId": "LTAI5tXXXXXX",
        "policy": "eyJleHBpcmF0aW9uIjoiMjAyNi0w...",
        "Signature": "xxxxxxxxx/yyyyy/zzzzz=",
        "success_action_status": "200"
      }
    }
  }
  ```

### 7.4 PGC 环幕作品管理

#### 7.4.1 获取画廊作品列表 (分页)
- **接口地址**: `GET /admin/pgc/artworks`
- **请求参数**:
  | 参数名 | 类型 | 是否必填 | 说明 |
  | :--- | :--- | :--- | :--- |
  | page | int | 否 | 页码，默认 1 |
  | limit | int | 否 | 每页数量，默认 10 |
  | type | string | 否 | 筛选类型：`image`, `video`, `audio` |

- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "list": [
        {
          "id": 1,
          "type": "video",
          "title": "午夜霓虹",
          "url": "https://litverse-bucket.oss-cn-hangzhou.aliyuncs.com/media/poster_cover.jpg",
          "mediaUrl": "https://litverse-bucket.oss-cn-hangzhou.aliyuncs.com/media/neon_midnight.mp4",
          "aspectRatio": 0.5625,
          "createdAt": "2026-06-14T15:00:00Z"
        }
      ],
      "total": 24
    }
  }
  ```

#### 7.4.2 新建画廊作品
- **接口地址**: `POST /admin/pgc/artworks`
- **请求参数**:
  ```json
  {
    "type": "video",
    "title": "新影像作品",
    "url": "https://litverse-bucket.oss-cn-hangzhou.aliyuncs.com/media/poster_cover.jpg", // 已上传的封面OSS链接
    "mediaUrl": "https://litverse-bucket.oss-cn-hangzhou.aliyuncs.com/media/sample_video.mp4", // 已上传的资源OSS链接
    "aspectRatio": 1.7778
  }
  ```
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "created success",
    "data": {
      "id": 25,
      "type": "video",
      "title": "新影像作品"
    }
  }
  ```

#### 7.4.3 更新画廊作品
- **接口地址**: `PUT /admin/pgc/artworks/:id`
- **请求参数**:
  ```json
  {
    "title": "已修改的艺术卡片标题",
    "url": "https://litverse-bucket.oss-cn-hangzhou.aliyuncs.com/media/poster_cover_new.jpg"
  }
  ```
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "updated success"
  }
  ```

#### 7.4.4 删除画廊作品
- **接口地址**: `DELETE /admin/pgc/artworks/:id`
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "deleted success"
  }
  ```

---

### 7.5 UGC 题库管理

#### 7.5.1 获取所有题目配置 (含权重)
- **接口地址**: `GET /admin/ugc/questions`
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "questions": [
        {
          "id": 1,
          "text": "如果电影是一场梦，你希望它是？",
          "options": [
            { "label": "霓虹闪烁的赛博都市", "value": "A", "weight": 1 },
            { "label": "斑驳旧时光里的弄堂", "value": "B", "weight": 2 }
          ]
        }
      ]
    }
  }
  ```

#### 7.5.2 保存/重写全部题库配置
- **接口地址**: `PUT /admin/ugc/questions`
- **请求参数**:
  ```json
  {
    "questions": [
      {
        "id": 1,
        "text": "如果电影是一场梦，你希望它是？",
        "options": [
          { "label": "霓虹闪烁的赛博都市", "value": "A", "weight": 1 },
          { "label": "斑驳旧时光里的弄堂", "value": "B", "weight": 2 }
        ]
      }
    ]
  }
  ```
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "questions updated successfully"
  }
  ```

---

### 7.6 用户与海报历史管理

#### 7.6.1 查询注册用户列表
- **接口地址**: `GET /admin/users`
- **请求参数**:
  | 参数名 | 类型 | 是否必填 | 说明 |
  | :--- | :--- | :--- | :--- |
  | page | int | 否 | 页码，默认 1 |
  | limit | int | 否 | 每页数量，默认 10 |
  | nickname | string | 否 | 根据昵称模糊搜索 |

- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "list": [
        {
          "id": 10086,
          "nickname": "浪漫独行客",
          "avatarUrl": "https://example.com/avatar.png",
          "createdAt": "2026-06-12T12:00:00Z"
        }
      ],
      "total": 128
    }
  }
  ```

#### 7.6.2 获取用户生成的海报历史列表
- **接口地址**: `GET /admin/ugc/posters`
- **请求参数**:
  | 参数名 | 类型 | 是否必填 | 说明 |
  | :--- | :--- | :--- | :--- |
  | page | int | 否 | 页码，默认 1 |
  | limit | int | 否 | 每页数量，默认 10 |
  | resultType | int | 否 | 过滤结果类型：1, 2, 3 |

- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "list": [
        {
          "posterId": "post_77283624",
          "resultType": 2,
          "resultName": "地摊儿纪实大师",
          "user": {
            "nickname": "浪漫独行客",
            "avatarUrl": "https://example.com/avatar.png"
          },
          "createdAt": "2026-06-14T15:00:00Z",
          "status": "active" // active 表示展示中，banned 表示违规已下架
        }
      ],
      "total": 5120
    }
  }
  ```

#### 7.6.3 下架/禁封违规测试海报
- **接口地址**: `PUT /admin/ugc/posters/:id/status`
- **请求参数**:
  ```json
  {
    "status": "banned" // active 恢复展示，banned 封禁下架
  }
  ```
- **响应数据**:
  ```json
  {
    "code": 0,
    "message": "poster status updated"
  }
  ```
