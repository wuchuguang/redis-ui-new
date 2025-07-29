// 转换规则引擎
export class ConversionEngine {
  constructor() {
    this.rules = []
    this.loadRules()
  }

  // 从本地存储加载规则
  loadRules() {
    try {
      const savedRules = localStorage.getItem('conversionRules')
      if (savedRules) {
        this.rules = JSON.parse(savedRules)
      }
    } catch (error) {
      console.error('加载转换规则失败:', error)
      this.rules = []
    }
  }

  // 保存规则到本地存储
  saveRules() {
    try {
      localStorage.setItem('conversionRules', JSON.stringify(this.rules))
    } catch (error) {
      console.error('保存转换规则失败:', error)
    }
  }

  // 更新规则
  updateRules(rules) {
    this.rules = rules
    this.saveRules()
  }

  // 将通配符模式转换为正则表达式
  patternToRegex(pattern) {
    // 将 {*} 转换为正则表达式的通配符
    const regexPattern = pattern
      .replace(/\{.*?\}/g, '[^:]+')  // {*} 匹配任意非冒号字符
      .replace(/\./g, '\\.')         // 转义点号
      .replace(/\*/g, '.*');         // * 匹配任意字符
    
    return new RegExp(`^${regexPattern}$`);
  }

  // 检查key是否匹配模式
  matchesPattern(key, pattern) {
    const regex = this.patternToRegex(pattern);
    return regex.test(key);
  }

  // 检查字段名是否匹配
  matchesField(fieldName, fieldPattern) {
    if (!fieldPattern) return true;
    if (fieldPattern === fieldName) return true;
    if (fieldPattern.includes('*')) {
      const regex = new RegExp(fieldPattern.replace(/\*/g, '.*'));
      return regex.test(fieldName);
    }
    return false;
  }

  // 获取适用于特定key和字段的转换规则
  getApplicableRules(key, dataType, fieldName = null) {
    return this.rules
      .filter(rule => 
        rule.enabled && 
        rule.dataType === dataType && 
        this.matchesPattern(key, rule.pattern) &&
        (dataType !== 'hash' || this.matchesField(fieldName, rule.fieldPattern))
      )
      .sort((a, b) => a.priority - b.priority);
  }

  // 转换值
  convertValue(value, convertType, mappingConfig = null) {
    try {
      switch (convertType) {
        case 'unix_timestamp_seconds':
          return new Date(parseInt(value) * 1000).toLocaleString('zh-CN');
        
        case 'unix_timestamp_milliseconds':
          return new Date(parseInt(value)).toLocaleString('zh-CN');
        
        case 'large_number':
          const num = parseInt(value);
          if (isNaN(num)) return value;
          if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
          if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
          if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
          return num.toString();
        
        case 'hex_to_text':
          try {
            const hex = value.replace(/\s/g, '');
            return Buffer.from(hex, 'hex').toString('utf8');
          } catch {
            return value;
          }
        
        case 'base64_decode':
          try {
            return atob(value);
          } catch {
            return value;
          }
        
        case 'json_format':
          try {
            return JSON.stringify(JSON.parse(value), null, 2);
          } catch {
            return value;
          }
        
        case 'status_mapping':
          const statusMap = {
            '1': '在线',
            '0': '离线',
            '2': '忙碌',
            'active': '活跃',
            'inactive': '非活跃'
          };
          return statusMap[value] || value;
        
        case 'custom_mapping':
          if (mappingConfig) {
            try {
              const mapping = typeof mappingConfig === 'string' 
                ? JSON.parse(mappingConfig) 
                : mappingConfig;
              return mapping[value] || value;
            } catch {
              return value;
            }
          }
          return value;
        
        default:
          return value;
      }
    } catch (error) {
      console.error(`转换失败: ${convertType}`, error);
      return value;
    }
  }

  // 转换String值
  convertStringValue(key, value) {
    const applicableRules = this.getApplicableRules(key, 'string');
    
    for (const rule of applicableRules) {
      const convertedValue = this.convertValue(value, rule.convertType, rule.mappingConfig);
      if (convertedValue !== value) {
        return {
          originalValue: value,
          convertedValue: convertedValue,
          rule: rule
        };
      }
    }
    
    return {
      originalValue: value,
      convertedValue: value,
      rule: null
    };
  }

  // 转换Hash字段值
  convertHashField(key, fieldName, fieldValue) {
    const applicableRules = this.getApplicableRules(key, 'hash', fieldName);
    
    for (const rule of applicableRules) {
      const convertedValue = this.convertValue(fieldValue, rule.convertType, rule.mappingConfig);
      if (convertedValue !== fieldValue) {
        return {
          originalValue: fieldValue,
          convertedValue: convertedValue,
          rule: rule
        };
      }
    }
    
    return {
      originalValue: fieldValue,
      convertedValue: fieldValue,
      rule: null
    };
  }

  // 转换Set成员值
  convertSetMember(key, memberValue) {
    const applicableRules = this.getApplicableRules(key, 'set');
    
    for (const rule of applicableRules) {
      const convertedValue = this.convertValue(memberValue, rule.convertType, rule.mappingConfig);
      if (convertedValue !== memberValue) {
        return {
          originalValue: memberValue,
          convertedValue: convertedValue,
          rule: rule
        };
      }
    }
    
    return {
      originalValue: memberValue,
      convertedValue: memberValue,
      rule: null
    };
  }

  // 转换List成员值
  convertListMember(key, memberValue) {
    const applicableRules = this.getApplicableRules(key, 'list');
    
    for (const rule of applicableRules) {
      const convertedValue = this.convertValue(memberValue, rule.convertType, rule.mappingConfig);
      if (convertedValue !== memberValue) {
        return {
          originalValue: memberValue,
          convertedValue: convertedValue,
          rule: rule
        };
      }
    }
    
    return {
      originalValue: memberValue,
      convertedValue: memberValue,
      rule: null
    };
  }

  // 转换ZSet成员值
  convertZSetMember(key, memberValue) {
    const applicableRules = this.getApplicableRules(key, 'zset');
    
    for (const rule of applicableRules) {
      const convertedValue = this.convertValue(memberValue, rule.convertType, rule.mappingConfig);
      if (convertedValue !== memberValue) {
        return {
          originalValue: memberValue,
          convertedValue: convertedValue,
          rule: rule
        };
      }
    }
    
    return {
      originalValue: memberValue,
      convertedValue: memberValue,
      rule: null
    };
  }

  // 通用转换方法 - 只返回匹配的规则，不进行实际转换
  convert(key, dataType, value, fieldName = null) {
    const applicableRules = this.getApplicableRules(key, dataType, fieldName);
    
    if (applicableRules.length > 0) {
      // 返回第一个匹配的规则
      return {
        originalValue: value,
        convertedValue: value, // 组件会自己处理转换
        rule: applicableRules[0]
      };
    }
    
    return {
      originalValue: value,
      convertedValue: value,
      rule: null
    };
  }
}

// 创建全局实例
export const conversionEngine = new ConversionEngine(); 