// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { notificationId, all = false } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    if (all) {
      // 删除所有通知
      await db.collection('notifications').where({
        userId: user._id
      }).remove()
      
      return {
        success: true,
        message: '所有通知已删除'
      }
    } else if (notificationId) {
      // 验证通知所有权
      const notificationResult = await db.collection('notifications').doc(notificationId).get()
      if (!notificationResult.data) {
        return { success: false, message: '通知不存在' }
      }
      
      if (notificationResult.data.userId !== user._id) {
        return { success: false, message: '无权删除此通知' }
      }
      
      // 删除单个通知
      await db.collection('notifications').doc(notificationId).remove()
      
      return {
        success: true,
        message: '通知已删除'
      }
    }
    
    return { success: false, message: '参数错误' }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}