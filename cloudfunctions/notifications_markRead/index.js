// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { notificationId, all } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const userId = userResult.data[0]._id
    
    if (all) {
      // 标记所有通知为已读
      const result = await db.collection('notifications').where({
        userId: userId,
        isRead: false
      }).update({
        data: {
          isRead: true
        }
      })
      
      return {
        success: true,
        updatedCount: result.stats.updated,
        message: `已将 ${result.stats.updated} 条通知标记为已读`
      }
    } else if (notificationId) {
      // 标记单条通知为已读
      const notificationResult = await db.collection('notifications').doc(notificationId).get()
      
      if (!notificationResult.data) {
        return { success: false, message: '通知不存在' }
      }
      
      if (notificationResult.data.userId !== userId) {
        return { success: false, message: '无权操作此通知' }
      }
      
      await db.collection('notifications').doc(notificationId).update({
        data: {
          isRead: true
        }
      })
      
      return {
        success: true,
        message: '已标记为已读'
      }
    }
    
    return { success: false, message: '参数错误' }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}