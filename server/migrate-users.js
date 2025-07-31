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
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    data: encrypted
  };
};

// 解密数据（支持新旧格式）
const decryptData = (encryptedData) => {
  // 检查是否是旧格式（没有iv字段或iv格式不正确）
  const isOldFormat = !encryptedData.iv || typeof encryptedData.iv !== 'string' || encryptedData.iv.length !== 32;
  
  if (isOldFormat) {
    // 使用旧的解密方法
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      const result = JSON.parse(decrypted);
      console.log('检测到旧格式加密数据，正在转换为新格式...');
      return result;
    } catch (error) {
      throw new Error(`旧格式解密失败: ${error.message}`);
    }
  } else {
    // 使用新的解密方法
    try {
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`新格式解密失败: ${error.message}`);
    }
  }
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