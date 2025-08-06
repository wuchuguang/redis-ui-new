const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { JWT_SECRET, USER_ROLES } = require('../utils/constants');

// 用户数据目录
const USERS_DIR = path.join(__dirname, '../users');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-long!!';

// 内存存储用户数据
const users = new Map();

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

// 确保用户数据目录存在
const ensureUsersDir = async () => {
  try {
    await fs.access(USERS_DIR);
  } catch (error) {
    await fs.mkdir(USERS_DIR, { recursive: true });
    console.log('创建用户数据目录:', USERS_DIR);
  }
};

// 确保用户数据结构完整
const ensureUserDataStructure = (user) => {
  // 移除连接相关字段，因为连接信息现在独立存储
  return user;
};

// 获取用户数据文件路径
const getUserFilePath = (username) => {
  return path.join(USERS_DIR, `${username}.json`);
};

// 保存单个用户数据到文件
const saveUserToFile = async (username) => {
  try {
    await ensureUsersDir();
    
    const user = users.get(username);
    if (!user) {
      throw new Error(`用户 ${username} 不存在`);
    }
    
    const encryptedData = encryptData(user);
    const userFilePath = getUserFilePath(username);
    await fs.writeFile(userFilePath, JSON.stringify(encryptedData, null, 2));
    console.log(`用户 ${username} 数据已加密保存到文件`);
  } catch (error) {
    console.error(`保存用户 ${username} 数据失败:`, error);
    throw error;
  }
};

// 从文件加载单个用户数据
const loadUserFromFile = async (username) => {
  try {
    const userFilePath = getUserFilePath(username);
    const fileExists = await fs.access(userFilePath).then(() => true).catch(() => false);
    
    if (!fileExists) {
      console.log(`用户 ${username} 数据文件不存在`);
      return null;
    }
    
    const fileContent = await fs.readFile(userFilePath, 'utf8');
    const encryptedData = JSON.parse(fileContent);
    const user = decryptData(encryptedData);
    
    // 确保用户数据结构完整
    const processedUser = ensureUserDataStructure(user);
    
    // 检查是否是旧格式，如果是则重新保存为新格式
    const isOldFormat = !encryptedData.iv || typeof encryptedData.iv !== 'string' || encryptedData.iv.length !== 32;
    if (isOldFormat) {
      console.log(`用户 ${username} 数据已转换为新格式`);
      // 重新加密保存为新格式
      const newEncryptedData = encryptData(processedUser);
      await fs.writeFile(userFilePath, JSON.stringify(newEncryptedData, null, 2));
    }
    
    return processedUser;
  } catch (error) {
    console.error(`加载用户 ${username} 数据失败:`, error);
    return null;
  }
};

// 从文件加载所有用户数据
const loadUsersFromFile = async () => {
  try {
    await ensureUsersDir();
    
    // 清空内存中的用户数据
    users.clear();
    
    // 读取用户数据目录中的所有文件
    const files = await fs.readdir(USERS_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    for (const file of jsonFiles) {
      const username = file.replace('.json', '');
      const user = await loadUserFromFile(username);
      
              if (user) {
          // 确保用户数据结构完整
          const completeUser = ensureUserDataStructure(user);
          users.set(username, completeUser);
          console.log(`加载用户: ${username}`);
        }
    }
    
    console.log(`从文件加载了 ${users.size} 个用户`);
    
    // 验证JWT密钥状态
    console.log('JWT密钥状态:', JWT_SECRET ? '已配置' : '使用默认密钥');
    console.log('JWT密钥长度:', JWT_SECRET.length);
    
  } catch (error) {
    console.error('加载用户数据失败:', error);
  }
};

// 初始化默认管理员用户
const initializeDefaultAdmin = async () => {
  if (!users.has('admin')) {
    const adminId = uuidv4();
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    
    const adminUser = {
      id: adminId,
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: USER_ROLES.ADMIN,
      nickname: '管理员',
      avatar: '',
      connections: [], // 自己的连接列表
      shareConnections: [], // 分享的连接列表 {id, joinCode, sharedAt}
      friendConnections: [], // 好友分享的连接列表 {id, ownerUsername, sharedAt}
      createdAt: new Date().toISOString()
    };
    
    users.set('admin', adminUser);
    await saveUserToFile('admin');
    console.log('默认管理员用户已创建: admin/admin123');
  }
};

// 用户注册
const registerUser = async (userData) => {
  const { username, email, password } = userData;
  
  // 验证输入
  if (!username || !email || !password) {
    throw new Error('用户名、邮箱和密码不能为空');
  }
  
  // 检查用户名是否已存在
  if (users.has(username)) {
    throw new Error('用户名已存在');
  }
  
  // 检查邮箱是否已存在
  const existingUser = Array.from(users.values()).find(user => user.email === email);
  if (existingUser) {
    throw new Error('邮箱已被使用');
  }
  
  // 创建新用户
  const userId = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  const newUser = {
    id: userId,
    username,
    email,
    password: hashedPassword,
    role: USER_ROLES.USER,
    nickname: username,
    avatar: '',
    connections: [], // 自己的连接列表
    shareConnections: [], // 分享的连接列表 {id, joinCode, sharedAt}
    friendConnections: [], // 好友分享的连接列表 {id, ownerUsername, sharedAt}
    createdAt: new Date().toISOString()
  };
  
  users.set(username, newUser);
  
  // 保存到文件
  await saveUserToFile(username);
  
  console.log(`新用户注册: ${username}`);
  
  const { password: _, ...userInfo } = newUser;
  return userInfo;
};

// 用户登录
const loginUser = async (credentials) => {
  const { username, password } = credentials;
  
  // 验证输入
  if (!username || !password) {
    throw new Error('用户名和密码不能为空');
  }
  
  // 查找用户
  const user = users.get(username);
  if (!user) {
    throw new Error('用户名或密码错误');
  }
  
  // 验证密码
  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) {
    throw new Error('用户名或密码错误');
  }
  
  // 生成JWT token - 延长过期时间到7天
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  // 返回用户信息（不包含密码）
  const { password: _, ...userInfo } = user;
  
  console.log(`用户登录: ${username}`);
  
  return { user: userInfo, token };
};

// 获取用户资料
const getUserProfile = (username) => {
  const user = users.get(username);
  if (!user) {
    throw new Error('用户不存在');
  }
  
  const { password: _, ...userInfo } = user;
  return userInfo;
};

// 根据用户名获取用户（包含密码，用于内部使用）
const getUserByUsername = (username) => {
  const user = users.get(username);
  if (!user) {
    throw new Error('用户不存在');
  }
  
  return user; // 返回完整用户信息，包括密码
};

// 更新用户资料
const updateUserProfile = async (username, updateData) => {
  const user = users.get(username);
  if (!user) {
    throw new Error('用户不存在');
  }
  
  // 更新用户信息
  if (updateData.email) user.email = updateData.email;
  if (updateData.nickname) user.nickname = updateData.nickname;
  if (updateData.avatar) user.avatar = updateData.avatar;
  
  // 保存到文件
  await saveUserToFile(username);
  
  const { password: _, ...userInfo } = user;
  return userInfo;
};

// 修改密码
const changePassword = async (username, oldPassword, newPassword) => {
  const user = users.get(username);
  if (!user) {
    throw new Error('用户不存在');
  }
  
  // 验证旧密码
  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isOldPasswordValid) {
    throw new Error('旧密码错误');
  }
  
  // 加密新密码
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedNewPassword;
  
  // 保存到文件
  await saveUserToFile(username);
  
  console.log(`用户密码已修改: ${username}`);
  
  return true;
};

// 注意：连接相关功能已移至 connectionService

// 获取用户的所有连接（包括分享的和好友的）
const getUserAllConnections = (username) => {
  const user = users.get(username);
  if (!user) {
    return [];
  }

  const allConnections = [];

  // 添加自己的连接
  if (user.connections && Array.isArray(user.connections)) {
    user.connections.forEach(conn => {
      allConnections.push({
        ...conn,
        owner: username,
        isOwner: true,
        canEdit: true,
        canDelete: true
      });
    });
  }

  // 添加好友分享的连接
  if (user.friendConnections && Array.isArray(user.friendConnections)) {
    user.friendConnections.forEach(fc => {
      const ownerUser = users.get(fc.ownerUsername);
      if (ownerUser && ownerUser.connections && Array.isArray(ownerUser.connections)) {
        const connection = ownerUser.connections.find(conn => conn.id === fc.id);
        if (connection) {
          allConnections.push({
            ...connection,
            owner: fc.ownerUsername,
            isOwner: false,
            canEdit: false,
            canDelete: true,
            sharedAt: fc.sharedAt
          });
        }
      }
    });
  }

  return allConnections;
};

// 获取所有用户（管理员功能）
const getAllUsers = () => {
  return Array.from(users.values()).map(user => {
    const { password: _, ...userInfo } = user;
    return userInfo;
  });
};

// 更新用户角色（管理员功能）
const updateUserRole = async (username, newRole) => {
  const user = users.get(username);
  if (!user) {
    throw new Error('用户不存在');
  }
  
  if (!Object.values(USER_ROLES).includes(newRole)) {
    throw new Error('无效的用户角色');
  }
  
  user.role = newRole;
  
  // 保存到文件
  await saveUserToFile(username);
  
  const { password: _, ...userInfo } = user;
  return userInfo;
};

// 删除用户（管理员功能）
const deleteUser = async (username) => {
  const user = users.get(username);
  if (!user) {
    throw new Error('用户不存在');
  }
  
  users.delete(username);
  
  // 删除用户文件
  try {
    const userFilePath = getUserFilePath(username);
    await fs.unlink(userFilePath);
    console.log(`用户文件已删除: ${userFilePath}`);
  } catch (error) {
    console.error(`删除用户文件失败: ${error.message}`);
  }
  
  console.log(`用户已删除: ${username}`);
  
  return true;
};

// 注意：连接相关功能已移至 connectionService

module.exports = {
  users,
  ensureUsersDir,
  ensureUserDataStructure,
  saveUserToFile,
  loadUserFromFile,
  loadUsersFromFile,
  initializeDefaultAdmin,
  registerUser,
  loginUser,
  getUserProfile,
  getUserByUsername,
  updateUserProfile,
  changePassword,
  getAllUsers,
  updateUserRole,
  deleteUser
}; 