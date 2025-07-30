<template>
  <div class="user-manager">
    <!-- 未登录状态 -->
    <div v-if="!currentUser" class="user-login">
      <el-dropdown @command="handleCommand" trigger="click">
        <div class="user-avatar">
          <el-avatar :size="32" icon="UserFilled" />
          <span class="login-text">登录</span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="login">登录</el-dropdown-item>
            <el-dropdown-item command="register">注册</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 已登录状态 -->
    <div v-else class="user-info">
      <el-dropdown @command="handleCommand" trigger="click">
        <div class="user-avatar">
          <el-avatar :size="32" :src="currentUser.avatar">
            {{ currentUser.username.charAt(0).toUpperCase() }}
          </el-avatar>
          <span class="username">{{ currentUser.username }}</span>
          <el-icon><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人资料</el-dropdown-item>
            <el-dropdown-item command="settings">设置</el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 登录对话框 -->
    <el-dialog
      v-model="showLoginDialog"
      title="用户登录"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input 
            v-model="loginForm.username" 
            placeholder="请输入用户名"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showLoginDialog = false">取消</el-button>
          <el-button type="primary" @click="handleLogin" :loading="loginLoading">
            登录
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 注册对话框 -->
    <el-dialog
      v-model="showRegisterDialog"
      title="用户注册"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input 
            v-model="registerForm.username" 
            placeholder="请输入用户名"
            @keyup.enter="handleRegister"
          />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input 
            v-model="registerForm.email" 
            placeholder="请输入邮箱"
            @keyup.enter="handleRegister"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="handleRegister"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
            @keyup.enter="handleRegister"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showRegisterDialog = false">取消</el-button>
          <el-button type="primary" @click="handleRegister" :loading="registerLoading">
            注册
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 个人资料对话框 -->
    <el-dialog
      v-model="showProfileDialog"
      title="个人资料"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="profileFormRef"
        :model="profileForm"
        :rules="profileRules"
        label-width="100px"
      >
        <el-form-item label="用户名">
          <el-input v-model="profileForm.username" disabled />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input 
            v-model="profileForm.email"
            @keyup.enter="handleUpdateProfile"
          />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input 
            v-model="profileForm.nickname"
            @keyup.enter="handleUpdateProfile"
          />
        </el-form-item>
        <el-form-item label="头像">
          <el-upload
            class="avatar-uploader"
            :show-file-list="false"
            :before-upload="beforeAvatarUpload"
            :on-success="handleAvatarSuccess"
          >
            <img v-if="profileForm.avatar" :src="profileForm.avatar" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="角色">
          <el-tag :type="getRoleTagType(profileForm.role)">
            {{ getRoleLabel(profileForm.role) }}
          </el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showProfileDialog = false">取消</el-button>
          <el-button type="primary" @click="handleUpdateProfile" :loading="profileLoading">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Plus } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { useConnectionStore } from '../stores/connection'

const userStore = useUserStore()
const connectionStore = useConnectionStore()

// 响应式数据
const showLoginDialog = ref(false)
const showRegisterDialog = ref(false)
const showProfileDialog = ref(false)
const loginLoading = ref(false)
const registerLoading = ref(false)
const profileLoading = ref(false)

// 表单引用
const loginFormRef = ref()
const registerFormRef = ref()
const profileFormRef = ref()

// 登录表单
const loginForm = reactive({
  username: '',
  password: ''
})

// 注册表单
const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 个人资料表单
const profileForm = reactive({
  username: '',
  email: '',
  nickname: '',
  avatar: '',
  role: ''
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const profileRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  nickname: [
    { max: 20, message: '昵称长度不能超过 20 个字符', trigger: 'blur' }
  ]
}

// 计算属性
const currentUser = computed(() => userStore.currentUser)

// 方法
const handleCommand = (command) => {
  switch (command) {
    case 'login':
      showLoginDialog.value = true
      break
    case 'register':
      showRegisterDialog.value = true
      break
    case 'profile':
      showProfileDialog.value = true
      loadProfileData()
      break
    case 'settings':
      // TODO: 实现设置功能
      ElMessage.info('设置功能开发中')
      break
    case 'logout':
      handleLogout()
      break
  }
}

const handleLogin = async () => {
  try {
    await loginFormRef.value.validate()
    loginLoading.value = true
    
    const success = await userStore.login(loginForm)
    if (success) {
      showLoginDialog.value = false
      ElMessage.success('登录成功')
      
      // 检查是否有临时连接需要合并
      if (connectionStore.hasTempConnections) {
        try {
          await ElMessageBox.confirm(
            '检测到您有临时连接，是否要合并到当前账户？',
            '合并临时连接',
            {
              confirmButtonText: '合并',
              cancelButtonText: '稍后处理',
              type: 'info'
            }
          )
          
          await connectionStore.mergeTempConnections()
        } catch (error) {
          // 用户取消操作
        }
      }
      
      // 重置表单
      Object.assign(loginForm, { username: '', password: '' })
    }
  } catch (error) {
    console.error('登录失败:', error)
  } finally {
    loginLoading.value = false
  }
}

const handleRegister = async () => {
  try {
    await registerFormRef.value.validate()
    registerLoading.value = true
    
    const success = await userStore.register(registerForm)
    if (success) {
      showRegisterDialog.value = false
      
      // 检查是否有临时连接需要合并
      if (connectionStore.hasTempConnections) {
        try {
          await ElMessageBox.confirm(
            '检测到您有临时连接，是否要合并到当前账户？',
            '合并临时连接',
            {
              confirmButtonText: '合并',
              cancelButtonText: '稍后处理',
              type: 'info'
            }
          )
          
          await connectionStore.mergeTempConnections()
        } catch (error) {
          // 用户取消操作
        }
      }
      
      // 重置表单
      Object.assign(registerForm, { username: '', email: '', password: '', confirmPassword: '' })
    }
  } catch (error) {
    console.error('注册失败:', error)
  } finally {
    registerLoading.value = false
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '确认退出', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await userStore.logout()
    ElMessage.success('已退出登录')
  } catch (error) {
    // 用户取消操作
  }
}

const loadProfileData = () => {
  if (currentUser.value) {
    Object.assign(profileForm, {
      username: currentUser.value.username,
      email: currentUser.value.email || '',
      nickname: currentUser.value.nickname || '',
      avatar: currentUser.value.avatar || '',
      role: currentUser.value.role || 'user'
    })
  }
}

const handleUpdateProfile = async () => {
  try {
    await profileFormRef.value.validate()
    profileLoading.value = true
    
    const success = await userStore.updateProfile(profileForm)
    if (success) {
      showProfileDialog.value = false
      ElMessage.success('个人资料更新成功')
    }
  } catch (error) {
    console.error('更新个人资料失败:', error)
  } finally {
    profileLoading.value = false
  }
}

const beforeAvatarUpload = (file) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    ElMessage.error('头像只能是 JPG 或 PNG 格式!')
  }
  if (!isLt2M) {
    ElMessage.error('头像大小不能超过 2MB!')
  }
  return isJPG && isLt2M
}

const handleAvatarSuccess = (response) => {
  profileForm.avatar = response.url
}

const getRoleLabel = (role) => {
  const roleMap = {
    'admin': '管理员',
    'user': '普通用户',
    'guest': '访客'
  }
  return roleMap[role] || role
}

const getRoleTagType = (role) => {
  const typeMap = {
    'admin': 'danger',
    'user': 'primary',
    'guest': 'info'
  }
  return typeMap[role] || 'info'
}
</script>

<style scoped>
.user-manager {
  display: flex;
  align-items: center;
}

.user-login,
.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-login:hover,
.user-info:hover {
  background-color: var(--el-fill-color-light);
}

.user-avatar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-text,
.username {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.avatar-uploader {
  text-align: center;
}

.avatar-uploader .avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-uploader .el-upload {
  border: 1px dashed var(--el-border-color);
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.avatar-uploader .el-upload:hover {
  border-color: var(--el-color-primary);
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 80px;
  height: 80px;
  text-align: center;
  line-height: 80px;
}
</style> 