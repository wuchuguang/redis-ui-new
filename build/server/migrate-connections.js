const fs = require('fs').promises;
const path = require('path');
const userService = require('./services/user');
const connectionService = require('./services/connection');

// 迁移用户连接数据到新的独立存储结构
const migrateUserConnections = async () => {
  console.log('开始迁移用户连接数据...');
  
  try {
    // 加载所有用户数据
    await userService.loadUsersFromFile();
    
    let migratedCount = 0;
    let errorCount = 0;
    
    // 遍历所有用户
    for (const [username, user] of userService.users.entries()) {
      console.log(`处理用户: ${username}`);
      
      try {
        // 迁移私有连接
        if (user.connections && Array.isArray(user.connections)) {
          for (const connection of user.connections) {
            try {
              // 创建新的连接信息
              const connectionInfo = await connectionService.createConnectionInfo(
                {
                  name: connection.name,
                  host: connection.host,
                  port: connection.port,
                  password: connection.password,
                  database: connection.database || 0
                },
                username
              );
              
              console.log(`  ✅ 迁移私有连接: ${connection.name} -> ${connectionInfo.id}`);
              migratedCount++;
            } catch (error) {
              console.error(`  ❌ 迁移私有连接失败: ${connection.name}`, error.message);
              errorCount++;
            }
          }
        }
        
        // 迁移分享连接
        if (user.shareConnections && Array.isArray(user.shareConnections)) {
          for (const shareInfo of user.shareConnections) {
            try {
              // 查找对应的连接
              const connection = user.connections?.find(conn => conn.id === shareInfo.id);
              if (connection) {
                // 设置分享码
                await connectionService.setShareCode(shareInfo.id, shareInfo.joinCode);
                console.log(`  ✅ 迁移分享连接: ${connection.name} (分享码: ${shareInfo.joinCode})`);
                migratedCount++;
              }
            } catch (error) {
              console.error(`  ❌ 迁移分享连接失败: ${shareInfo.id}`, error.message);
              errorCount++;
            }
          }
        }
        
        // 迁移好友连接（从其他用户接收的分享）
        if (user.friendConnections && Array.isArray(user.friendConnections)) {
          for (const friendInfo of user.friendConnections) {
            try {
              // 添加参与者
              await connectionService.addParticipant(friendInfo.id, username);
              console.log(`  ✅ 迁移好友连接: ${friendInfo.id} -> 参与者: ${username}`);
              migratedCount++;
            } catch (error) {
              console.error(`  ❌ 迁移好友连接失败: ${friendInfo.id}`, error.message);
              errorCount++;
            }
          }
        }
        
      } catch (error) {
        console.error(`处理用户 ${username} 失败:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n迁移完成!');
    console.log(`✅ 成功迁移: ${migratedCount} 个连接`);
    console.log(`❌ 迁移失败: ${errorCount} 个连接`);
    
    // 清理用户数据中的连接信息
    console.log('\n清理用户数据中的连接信息...');
    for (const [username, user] of userService.users.entries()) {
      try {
        // 移除连接相关字段
        delete user.connections;
        delete user.shareConnections;
        delete user.friendConnections;
        
        // 保存更新后的用户数据
        await userService.saveUserToFile(username);
        console.log(`  ✅ 清理用户数据: ${username}`);
      } catch (error) {
        console.error(`  ❌ 清理用户数据失败: ${username}`, error.message);
      }
    }
    
    console.log('\n数据迁移和清理完成!');
    
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    process.exit(1);
  }
};

// 验证迁移结果
const verifyMigration = async () => {
  console.log('\n验证迁移结果...');
  
  try {
    // 重新加载用户数据
    await userService.loadUsersFromFile();
    
    let totalConnections = 0;
    
    // 检查每个用户的连接
    for (const [username, user] of userService.users.entries()) {
      console.log(`验证用户: ${username}`);
      
      // 获取用户的所有连接
      const userConnections = await connectionService.getUserConnections(username);
      console.log(`  连接数量: ${userConnections.length}`);
      totalConnections += userConnections.length;
      
      // 验证连接信息
      for (const connection of userConnections) {
        console.log(`    - ${connection.redis.name} (${connection.redis.host}:${connection.redis.port})`);
        console.log(`      所有者: ${connection.owner}`);
        console.log(`      参与者: ${connection.participants.join(', ') || '无'}`);
        if (connection.shareCode) {
          console.log(`      分享码: ${connection.shareCode}`);
        }
      }
    }
    
    console.log(`\n验证完成! 总连接数: ${totalConnections}`);
    
  } catch (error) {
    console.error('验证过程中发生错误:', error);
  }
};

// 主函数
const main = async () => {
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      await migrateUserConnections();
      break;
    case 'verify':
      await verifyMigration();
      break;
    case 'all':
      await migrateUserConnections();
      await verifyMigration();
      break;
    default:
      console.log('使用方法:');
      console.log('  node migrate-connections.js migrate  - 执行迁移');
      console.log('  node migrate-connections.js verify   - 验证迁移结果');
      console.log('  node migrate-connections.js all      - 执行迁移并验证');
      break;
  }
};

// 运行迁移
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  migrateUserConnections,
  verifyMigration
}; 