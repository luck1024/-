// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    // 获取用户设置
    const settingsResult = await db.collection('user_settings').where({
      userId: userResult.data[0]._id
    }).get()
    
    // 默认设置
    const defaultSettings = {
      notificationEnabled: true,
      reminderEnabled: true,
      themeColor: 'default',
      privacyMode: false,
      language: 'zh_CN'
    }
    
    if (settingsResult.data.length === 0) {
      // 创建默认设置
      const newSettings = {
        userId: userResult.data[0]._id,
        ...defaultSettings,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
      
      await db.collection('user_settings').add({
        data: newSettings
      })
      
      return {
        success: true,
        settings: defaultSettings
      }
    }
    
    // 返回现有设置
    const settings = settingsResult.data[0]
    return {
      success: true,
      settings: {
        notificationEnabled: settings.notificationEnabled !== undefined ? settings.notificationEnabled : defaultSettings.notificationEnabled,
        reminderEnabled: settings.reminderEnabled !== undefined ? settings.reminderEnabled : defaultSettings.reminderEnabled,
        themeColor: settings.themeColor || defaultSettings.themeColor,
        privacyMode: settings.privacyMode !== undefined ? settings.privacyMode : defaultSettings.privacyMode,
        language: settings.language || defaultSettings.language
      }
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}