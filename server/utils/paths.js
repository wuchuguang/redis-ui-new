const path = require('path')

// 应用根目录：server/utils/.. = server；打包后 __dirname=dist/server，故 .. = dist
const APP_ROOT = path.join(__dirname, '..')

module.exports = {
  APP_ROOT,
  CONNECTIONS_DIR: path.join(APP_ROOT, 'connections'),
  USERS_DIR: path.join(APP_ROOT, 'users'),
  DATA_DIR: path.join(APP_ROOT, 'data')
}
