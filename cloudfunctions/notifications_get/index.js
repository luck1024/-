// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { page = 1, pageSize = 20, type } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const userId = userResult.data[0]._id
    
    // 构建查询条件
    const query = { userId: userId }
    if (type) {
      query.type = type
    }
    
    // 获取通知总数
    const totalResult = await db.collection('notifications').where(query).count()
    
    // 分页获取通知
    const notificationsResult = await db.collection('notifications')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取未读通知数量
    const unreadResult = await db.collection('notifications')
      .where({
        userId: userId,
        isRead: false
      })
      .count()
    
    return {
      success: true,
      notifications: notificationsResult.data,
      total: totalResult.total,
      unreadCount: unreadResult.total,
      currentPage: page,
      pageSize: pageSize,
      totalPages: Math.ceil(totalResult.total / pageSize)
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}