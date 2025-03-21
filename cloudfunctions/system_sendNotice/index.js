// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { title, content, targetType, targetId, adminKey } = event
  
  // 简单的管理员验证
  const ADMIN_KEY = 'your_admin_key_here' // 请替换为您的实际管理员密钥
  if (adminKey !== ADMIN_KEY) {
    return { success: false, message: '无权操作' }
  }
  
  try {
    if (!title || !content) {
      return { success: false, message: '标题和内容不能为空' }
    }
    
    const noticeData = {
      title: title,
      content: content,
      isRead: false,
      createTime: db.serverDate()
    }
    
    let userQuery = {}
    
    // 确定通知目标
    if (targetType === 'user' && targetId) {
      // 发送给特定用户
      userQuery = { _id: targetId }
    } else if (targetType === 'couple' && targetId) {
      // 发送给特定情侣
      const coupleResult = await db.collection('couples').doc(targetId).get()
      if (!coupleResult.data) {
        return { success: false, message: '指定的情侣关系不存在' }
      }
      
      userQuery = {
        _id: db.command.in([coupleResult.data.userIdA, coupleResult.data.userIdB])
      }
    }
    // 如果没有指定目标，则发送给所有用户
    
    // 获取目标用户
    const userResult = await db.collection('users').where(userQuery).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '没有找到目标用户' }
    }
    
    // 批量发送通知
    const noticePromises = userResult.data.map(user => {
      return db.collection('system_notices').add({
        data: {
          ...noticeData,
          userId: user._id
        }
      })
    })
    
    await Promise.all(noticePromises)
    
    return {
      success: true,
      sentCount: userResult.data.length,
      message: `成功发送通知给 ${userResult.data.length} 位用户`
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}