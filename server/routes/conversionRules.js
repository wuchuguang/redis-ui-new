const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// 应用认证中间件到所有路由
router.use(authenticateToken);

// 获取转换规则列表
router.get('/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const username = req.user.username;
    
    const rulesPath = path.join(__dirname, '..', 'connections', connectionId, 'rules', `${username}.json`);
    
    try {
      const rulesData = await fs.readFile(rulesPath, 'utf8');
      const rules = JSON.parse(rulesData);
      res.json({ success: true, data: rules });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在，返回空规则
        res.json({ success: true, data: [] });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('获取转换规则失败:', error);
    res.status(500).json({ success: false, message: '获取转换规则失败' });
  }
});

// 添加单条转换规则
router.post('/:connectionId/rule', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const username = req.user.username;
    const rule = req.body;
    
    if (!rule || !rule.name || !rule.pattern) {
      return res.status(400).json({ success: false, message: '规则数据不完整' });
    }
    
    const connectionDir = path.join(__dirname, '..', 'connections', connectionId);
    const rulesDir = path.join(connectionDir, 'rules');
    const rulesPath = path.join(rulesDir, `${username}.json`);
    
    // 确保目录存在
    await fs.mkdir(rulesDir, { recursive: true });
    
    // 读取现有规则
    let rules = [];
    try {
      const rulesData = await fs.readFile(rulesPath, 'utf8');
      rules = JSON.parse(rulesData);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    // 生成规则ID
    rule.id = Date.now().toString();
    rule.createdAt = new Date().toISOString();
    rule.updatedAt = new Date().toISOString();
    
    // 添加新规则
    rules.push(rule);
    
    // 保存规则
    await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2), 'utf8');
    
    res.json({ success: true, data: rule, message: '转换规则添加成功' });
  } catch (error) {
    console.error('添加转换规则失败:', error);
    res.status(500).json({ success: false, message: '添加转换规则失败' });
  }
});

// 更新单条转换规则
router.put('/:connectionId/rule/:ruleId', async (req, res) => {
  try {
    const { connectionId, ruleId } = req.params;
    const username = req.user.username;
    const updatedRule = req.body;
    
    if (!updatedRule || !updatedRule.name || !updatedRule.pattern) {
      return res.status(400).json({ success: false, message: '规则数据不完整' });
    }
    
    const rulesPath = path.join(__dirname, '..', 'connections', connectionId, 'rules', `${username}.json`);
    
    // 读取现有规则
    let rules = [];
    try {
      const rulesData = await fs.readFile(rulesPath, 'utf8');
      rules = JSON.parse(rulesData);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ success: false, message: '规则不存在' });
      }
      throw error;
    }
    
    // 查找并更新规则
    const ruleIndex = rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) {
      return res.status(404).json({ success: false, message: '规则不存在' });
    }
    
    // 更新规则
    updatedRule.id = ruleId;
    updatedRule.updatedAt = new Date().toISOString();
    updatedRule.createdAt = rules[ruleIndex].createdAt; // 保持创建时间不变
    
    rules[ruleIndex] = updatedRule;
    
    // 保存规则
    await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2), 'utf8');
    
    res.json({ success: true, data: updatedRule, message: '转换规则更新成功' });
  } catch (error) {
    console.error('更新转换规则失败:', error);
    res.status(500).json({ success: false, message: '更新转换规则失败' });
  }
});

// 删除单条转换规则
router.delete('/:connectionId/rule/:ruleId', async (req, res) => {
  try {
    const { connectionId, ruleId } = req.params;
    const username = req.user.username;
    
    const rulesPath = path.join(__dirname, '..', 'connections', connectionId, 'rules', `${username}.json`);
    
    // 读取现有规则
    let rules = [];
    try {
      const rulesData = await fs.readFile(rulesPath, 'utf8');
      rules = JSON.parse(rulesData);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ success: false, message: '规则不存在' });
      }
      throw error;
    }
    
    // 查找并删除规则
    const ruleIndex = rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) {
      return res.status(404).json({ success: false, message: '规则不存在' });
    }
    
    const deletedRule = rules[ruleIndex];
    rules.splice(ruleIndex, 1);
    
    // 保存规则
    await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2), 'utf8');
    
    res.json({ success: true, data: deletedRule, message: '转换规则删除成功' });
  } catch (error) {
    console.error('删除转换规则失败:', error);
    res.status(500).json({ success: false, message: '删除转换规则失败' });
  }
});

// 切换规则启用状态
router.patch('/:connectionId/rule/:ruleId/toggle', async (req, res) => {
  try {
    const { connectionId, ruleId } = req.params;
    const username = req.user.username;
    
    const rulesPath = path.join(__dirname, '..', 'connections', connectionId, 'rules', `${username}.json`);
    
    // 读取现有规则
    let rules = [];
    try {
      const rulesData = await fs.readFile(rulesPath, 'utf8');
      rules = JSON.parse(rulesData);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ success: false, message: '规则不存在' });
      }
      throw error;
    }
    
    // 查找并切换规则状态
    const ruleIndex = rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) {
      return res.status(404).json({ success: false, message: '规则不存在' });
    }
    
    rules[ruleIndex].enabled = !rules[ruleIndex].enabled;
    rules[ruleIndex].updatedAt = new Date().toISOString();
    
    // 保存规则
    await fs.writeFile(rulesPath, JSON.stringify(rules, null, 2), 'utf8');
    
    res.json({ 
      success: true, 
      data: rules[ruleIndex], 
      message: `规则${rules[ruleIndex].enabled ? '启用' : '禁用'}成功` 
    });
  } catch (error) {
    console.error('切换规则状态失败:', error);
    res.status(500).json({ success: false, message: '切换规则状态失败' });
  }
});

// 获取连接的所有用户规则（管理员功能）
router.get('/:connectionId/all', async (req, res) => {
  try {
    const { connectionId } = req.params;
    
    const rulesDir = path.join(__dirname, '..', 'connections', connectionId, 'rules');
    
    try {
      const files = await fs.readdir(rulesDir);
      const allRules = {};
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const userRulesPath = path.join(rulesDir, file);
          const rulesData = await fs.readFile(userRulesPath, 'utf8');
          const rules = JSON.parse(rulesData);
          const username = file.replace('.json', '');
          allRules[username] = rules;
        }
      }
      
      res.json({ success: true, data: allRules });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 目录不存在，返回空对象
        res.json({ success: true, data: {} });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('获取所有转换规则失败:', error);
    res.status(500).json({ success: false, message: '获取所有转换规则失败' });
  }
});

module.exports = router; 