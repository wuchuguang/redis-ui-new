const fs = require('fs').promises;
const path = require('path');

// 清理脚本 - 清理所有用户、连接和运行时数据
const clearAllData = async () => {
  console.log('🚨 开始清理所有数据...');
  console.log('⚠️  警告：此操作将删除所有用户数据、连接数据和运行时数据！');
  console.log('⚠️  此操作不可逆，请确认您真的要清理所有数据！');
  
  try {
    // 1. 清理用户数据目录
    const usersDir = path.join(__dirname, 'users');
    console.log('\n📁 清理用户数据目录...');
    try {
      const userFiles = await fs.readdir(usersDir);
      for (const file of userFiles) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(usersDir, file));
          console.log(`  ✅ 删除用户文件: ${file}`);
        }
      }
      console.log(`  ✅ 用户数据目录清理完成，删除了 ${userFiles.length} 个文件`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('  ℹ️  用户数据目录不存在，跳过');
      } else {
        console.error('  ❌ 清理用户数据目录失败:', error.message);
      }
    }

    // 2. 清理连接数据目录
    const connectionsDir = path.join(__dirname, 'connections');
    console.log('\n📁 清理连接数据目录...');
    try {
      const connectionDirs = await fs.readdir(connectionsDir);
      for (const connectionId of connectionDirs) {
        const connectionPath = path.join(connectionsDir, connectionId);
        const stats = await fs.stat(connectionPath);
        
        if (stats.isDirectory()) {
          // 递归删除连接目录及其内容
          await fs.rm(connectionPath, { recursive: true, force: true });
          console.log(`  ✅ 删除连接目录: ${connectionId}`);
        }
      }
      console.log(`  ✅ 连接数据目录清理完成，删除了 ${connectionDirs.length} 个连接`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('  ℹ️  连接数据目录不存在，跳过');
      } else {
        console.error('  ❌ 清理连接数据目录失败:', error.message);
      }
    }

    // 3. 清理操作历史数据目录
    const historyDir = path.join(__dirname, 'data/operation-history');
    console.log('\n📁 清理操作历史数据目录...');
    try {
      const historyFiles = await fs.readdir(historyDir);
      for (const file of historyFiles) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(historyDir, file));
          console.log(`  ✅ 删除历史文件: ${file}`);
        }
      }
      console.log(`  ✅ 操作历史数据目录清理完成，删除了 ${historyFiles.length} 个文件`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('  ℹ️  操作历史数据目录不存在，跳过');
      } else {
        console.error('  ❌ 清理操作历史数据目录失败:', error.message);
      }
    }

    // 4. 清理临时数据目录
    const tempDir = path.join(__dirname, 'data/temp');
    console.log('\n📁 清理临时数据目录...');
    try {
      const tempFiles = await fs.readdir(tempDir);
      for (const file of tempFiles) {
        await fs.unlink(path.join(tempDir, file));
        console.log(`  ✅ 删除临时文件: ${file}`);
      }
      console.log(`  ✅ 临时数据目录清理完成，删除了 ${tempFiles.length} 个文件`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('  ℹ️  临时数据目录不存在，跳过');
      } else {
        console.error('  ❌ 清理临时数据目录失败:', error.message);
      }
    }

    // 5. 清理日志文件
    const logsDir = path.join(__dirname, 'logs');
    console.log('\n📁 清理日志文件...');
    try {
      const logFiles = await fs.readdir(logsDir);
      for (const file of logFiles) {
        if (file.endsWith('.log')) {
          await fs.unlink(path.join(logsDir, file));
          console.log(`  ✅ 删除日志文件: ${file}`);
        }
      }
      console.log(`  ✅ 日志文件清理完成，删除了 ${logFiles.length} 个文件`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('  ℹ️  日志目录不存在，跳过');
      } else {
        console.error('  ❌ 清理日志文件失败:', error.message);
      }
    }

    // 6. 清理缓存文件
    const cacheDir = path.join(__dirname, 'cache');
    console.log('\n📁 清理缓存文件...');
    try {
      const cacheFiles = await fs.readdir(cacheDir);
      for (const file of cacheFiles) {
        await fs.unlink(path.join(cacheDir, file));
        console.log(`  ✅ 删除缓存文件: ${file}`);
      }
      console.log(`  ✅ 缓存文件清理完成，删除了 ${cacheFiles.length} 个文件`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('  ℹ️  缓存目录不存在，跳过');
      } else {
        console.error('  ❌ 清理缓存文件失败:', error.message);
      }
    }

    // 7. 清理空目录
    console.log('\n📁 清理空目录...');
    const dirsToClean = [
      path.join(__dirname, 'users'),
      path.join(__dirname, 'connections'),
      path.join(__dirname, 'data/operation-history'),
      path.join(__dirname, 'data/temp'),
      path.join(__dirname, 'logs'),
      path.join(__dirname, 'cache'),
      path.join(__dirname, 'data')
    ];

    for (const dir of dirsToClean) {
      try {
        const files = await fs.readdir(dir);
        if (files.length === 0) {
          await fs.rmdir(dir);
          console.log(`  ✅ 删除空目录: ${path.basename(dir)}`);
        }
      } catch (error) {
        // 目录不存在或不为空，跳过
      }
    }

    console.log('\n🎉 数据清理完成！');
    console.log('\n📋 清理总结:');
    console.log('  ✅ 用户数据已清理');
    console.log('  ✅ 连接数据已清理');
    console.log('  ✅ 操作历史已清理');
    console.log('  ✅ 临时数据已清理');
    console.log('  ✅ 日志文件已清理');
    console.log('  ✅ 缓存文件已清理');
    console.log('  ✅ 空目录已清理');
    
    console.log('\n💡 提示:');
    console.log('  - 系统现在处于全新状态');
    console.log('  - 需要重新创建用户和连接');
    console.log('  - 建议重启服务器以确保完全清理');

  } catch (error) {
    console.error('\n❌ 清理过程中发生错误:', error.message);
    process.exit(1);
  }
};

// 清理特定类型的数据
const clearUsers = async () => {
  console.log('🗑️  清理用户数据...');
  const usersDir = path.join(__dirname, 'users');
  try {
    const userFiles = await fs.readdir(usersDir);
    for (const file of userFiles) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(usersDir, file));
        console.log(`  ✅ 删除用户文件: ${file}`);
      }
    }
    console.log(`✅ 用户数据清理完成，删除了 ${userFiles.length} 个文件`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  用户数据目录不存在');
    } else {
      console.error('❌ 清理用户数据失败:', error.message);
    }
  }
};

const clearConnections = async () => {
  console.log('🗑️  清理连接数据...');
  const connectionsDir = path.join(__dirname, 'connections');
  try {
    const connectionDirs = await fs.readdir(connectionsDir);
    for (const connectionId of connectionDirs) {
      const connectionPath = path.join(connectionsDir, connectionId);
      await fs.rm(connectionPath, { recursive: true, force: true });
      console.log(`  ✅ 删除连接: ${connectionId}`);
    }
    console.log(`✅ 连接数据清理完成，删除了 ${connectionDirs.length} 个连接`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  连接数据目录不存在');
    } else {
      console.error('❌ 清理连接数据失败:', error.message);
    }
  }
};

const clearHistory = async () => {
  console.log('🗑️  清理操作历史...');
  const historyDir = path.join(__dirname, 'data/operation-history');
  try {
    const historyFiles = await fs.readdir(historyDir);
    for (const file of historyFiles) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(historyDir, file));
        console.log(`  ✅ 删除历史文件: ${file}`);
      }
    }
    console.log(`✅ 操作历史清理完成，删除了 ${historyFiles.length} 个文件`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  操作历史目录不存在');
    } else {
      console.error('❌ 清理操作历史失败:', error.message);
    }
  }
};

const clearTemp = async () => {
  console.log('🗑️  清理临时数据...');
  const tempDir = path.join(__dirname, 'data/temp');
  try {
    const tempFiles = await fs.readdir(tempDir);
    for (const file of tempFiles) {
      await fs.unlink(path.join(tempDir, file));
      console.log(`  ✅ 删除临时文件: ${file}`);
    }
    console.log(`✅ 临时数据清理完成，删除了 ${tempFiles.length} 个文件`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  临时数据目录不存在');
    } else {
      console.error('❌ 清理临时数据失败:', error.message);
    }
  }
};

// 主函数
const main = async () => {
  const command = process.argv[2];
  
  switch (command) {
    case 'all':
      await clearAllData();
      break;
    case 'users':
      await clearUsers();
      break;
    case 'connections':
      await clearConnections();
      break;
    case 'history':
      await clearHistory();
      break;
    case 'temp':
      await clearTemp();
      break;
    default:
      console.log('🗑️  Redis Web 数据清理工具');
      console.log('');
      console.log('使用方法:');
      console.log('  node clear.js all         - 清理所有数据（用户、连接、历史、临时等）');
      console.log('  node clear.js users       - 只清理用户数据');
      console.log('  node clear.js connections - 只清理连接数据');
      console.log('  node clear.js history     - 只清理操作历史');
      console.log('  node clear.js temp        - 只清理临时数据');
      console.log('');
      console.log('⚠️  警告: 清理操作不可逆，请谨慎使用！');
      break;
  }
};

// 运行清理
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  clearAllData,
  clearUsers,
  clearConnections,
  clearHistory,
  clearTemp
}; 