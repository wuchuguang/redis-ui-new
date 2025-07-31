# Redis管理工具API文档

## 概述

本文档描述了Redis管理工具的所有后端API接口。API采用RESTful设计风格，支持JWT认证。

## 快速开始

### 1. 生成API文档

```bash
# 生成静态文档
npm run docs

# 生成并启动本地服务器查看文档
npm run docs:serve
```

### 2. 查看文档

生成文档后，可以在以下位置查看：
- 静态文件：`docs/` 目录
- 本地服务器：`http://localhost:8080`

## API分组

### 认证相关 (Auth)
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取用户资料
- `PUT /api/auth/profile` - 更新用户资料
- `PUT /api/auth/password` - 修改密码
- `POST /api/auth/refresh-token` - 刷新访问令牌

### 连接管理 (Connections)
- `POST /api/connections` - 创建Redis连接
- `GET /api/connections` - 获取连接列表
- `PUT /api/connections/:id` - 更新连接
- `DELETE /api/connections/:id` - 删除连接
- `POST /api/connections/:id/reconnect` - 重新连接
- `POST /api/connections/:id/share` - 分享连接
- `POST /api/connections/join` - 加入分享连接
- `POST /api/connections/temp` - 创建临时连接
- `POST /api/connections/test` - 测试连接
- `GET /api/connections/:id/info` - 获取Redis服务器信息
- `POST /api/connections/:id/ping` - Ping连接
- `POST /api/connections/:id/close` - 关闭连接

### 键值操作 (Keys)
- `GET /api/connections/:id/:db/keys` - 获取键列表
- `GET /api/connections/:id/:db/key/:keyName` - 获取键值
- `PUT /api/connections/:id/:db/key/:oldKeyName/rename` - 重命名键
- `PUT /api/connections/:connectionId/:database/hash/:keyName/field` - 更新Hash字段
- `PUT /api/connections/:connectionId/:database/string/:keyName` - 更新String值
- `DELETE /api/connections/:connectionId/:database/hash/:keyName/field` - 删除Hash字段
- `DELETE /api/connections/:connectionId/:database/hash/:keyName/fields` - 批量删除Hash字段
- `DELETE /api/connections/:id/:db/keys/group/:prefix` - 删除键组

### 操作历史 (Operations)
- `GET /api/operations/:connectionId/history` - 获取操作历史
- `DELETE /api/operations/:connectionId/history` - 清空操作历史

## 认证

大部分API需要JWT认证，请在请求头中包含：

```
Authorization: Bearer <your-jwt-token>
```

## 响应格式

所有API都返回JSON格式的响应：

```json
{
  "success": true,
  "message": "操作成功",
  "data": {}
}
```

### 错误响应

```json
{
  "success": false,
  "message": "错误描述"
}
```

## 状态码

- `200` - 请求成功
- `400` - 请求参数错误
- `401` - 认证失败
- `403` - 权限不足
- `404` - 资源不存在
- `500` - 服务器内部错误

## 开发说明

### 添加新的API文档

1. 在对应的路由文件中添加apidoc注释
2. 使用 `@api` 标签定义API基本信息
3. 使用 `@apiParam` 定义参数
4. 使用 `@apiSuccess` 定义成功响应
5. 使用 `@apiError` 定义错误响应
6. 使用 `@apiExample` 提供请求示例

### 示例

```javascript
/**
 * @api {post} /api/example 示例API
 * @apiName ExampleAPI
 * @apiGroup Example
 * @apiVersion 1.0.0
 * 
 * @apiDescription 这是一个示例API
 * 
 * @apiParam {String} name 名称
 * 
 * @apiSuccess {Boolean} success=true 操作成功
 * @apiSuccess {String} message 成功消息
 * 
 * @apiError {Object} 400 参数错误
 */
router.post('/example', (req, res) => {
  // API实现
});
```

## 更新文档

修改API后，重新生成文档：

```bash
npm run docs
```

## 注意事项

1. 所有时间戳使用ISO 8601格式
2. 数据库编号范围：0-15
3. 端口号范围：1-65535
4. JWT令牌有效期为7天
5. 操作历史最多保存1000条记录 