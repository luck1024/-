// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { settings } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    // 获取当前设置
    const settingsResult = await db.collection('user_settings').where({
      userId: userResult.data[0]._id
    }).get()
    
    if (settingsResult.data.length === 0) {
      // 创建新设置
      await db.collection('user_settings').add({
        data: {
          userId: userResult.data[0]._id,
          notificationEnabled: settings.notificationEnabled !== undefined ? settings.notificationEnabled : true,
          reminderEnabled: settings.reminderEnabled !== undefined ? settings.reminderEnabled : true,
          themeColor: settings.themeColor || 'default',
          privacyMode: settings.privacyMode !== undefined ? settings.privacyMode : false,
          language: settings.language || 'zh_CN',
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    } else {
      // 更新设置
      const updateData = {
        updateTime: db.serverDate()
      }
      
      if (settings.notificationEnabled !== undefined) updateData.notificationEnabled = settings.notificationEnabled
      if (settings.reminderEnabled !== undefined) updateData.reminderEnabled = settings.reminderEnabled
      if (settings.themeColor !== undefined) updateData.themeColor = settings.themeColor
      if (settings.privacyMode !== undefined) updateData.privacyMode = settings.privacyMode
      if (settings.language !== undefined) updateData.language = settings.language
      
      await db.collection('user_settings').doc(settingsResult.data[0]._id).update({
        data: updateData
      })
    }
    
    return {
      success: true,
      message: '设置更新成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}