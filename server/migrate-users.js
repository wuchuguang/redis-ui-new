const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 配置
const OLD_AUTH_FILE = path.join(__dirname, '../auth.json');
const USERS_DIR = path.join(__dirname, '../users');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-long!!';

// 加密数据
const encryptData = (data) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    data: encrypted
  };
};

// 解密数据
const decryptData = (encryptedData) => {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

// 获取用户文件路径
const getUserFilePath = (username) => {
  return path.join(USERS_DIR, `${username}.json`);
};

// 确保用户目录存在
const ensureUsersDir = async () => {
  try {
    await fs.access(USERS_DIR);
  } catch (error) {
    await fs.mkdir(USERS_DIR, { recursive: true });
    console.log('创建用户数据目录:', USERS_DIR);
  }
};

// 迁移用户数据
const migrateUsers = async () => {
  try {
    console.log('开始迁移用户数据...');
    
    // 检查旧文件是否存在
    const oldFileExists = await fs.access(OLD_AUTH_FILE).then(() => true).catch(() => false);
    if (!oldFileExists) {
      console.log('旧用户数据文件不存在，无需迁移');
      return;
    }
    
    // 确保用户目录存在
    await ensureUsersDir();
    
    // 读取旧文件
    console.log('读取旧用户数据文件...');
    const fileContent = await fs.readFile(OLD_AUTH_FILE, 'utf8');
    const encryptedData = JSON.parse(fileContent);
    const usersArray = decryptData(encryptedData);
    
    console.log(`发现 ${usersArray.length} 个用户需要迁移`);
    
    // 迁移每个用户
    for (const user of usersArray) {
      const username = user.username;
      const userFilePath = getUserFilePath(username);
      
      // 检查用户文件是否已存在
      const userFileExists = await fs.access(userFilePath).then(() => true).catch(() => false);
      if (userFileExists) {
        console.log(`用户 ${username} 文件已存在，跳过`);
        continue;
      }
      
      // 加密并保存用户数据
      const userEncryptedData = encryptData(user);
      await fs.writeFile(userFilePath, JSON.stringify(userEncryptedData, null, 2));
      
      console.log(`✅ 用户 ${username} 迁移完成`);
    }
    
    // 备份旧文件
    const backupPath = OLD_AUTH_FILE + '.backup.' + Date.now();
    await fs.copyFile(OLD_AUTH_FILE, backupPath);
    console.log(`旧文件已备份到: ${backupPath}`);
    
    console.log('🎉 用户数据迁移完成！');
    console.log(`新用户数据目录: ${USERS_DIR}`);
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
};

// 运行迁移
migrateUsers(); 