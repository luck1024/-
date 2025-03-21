// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { page = 1, pageSize = 10 } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    if (!user.bindUserId) {
      return { success: false, message: '您还没有绑定伴侣' }
    }
    
    // 获取情侣双方的动态
    const totalResult = await db.collection('moments').where({
      userId: db.command.in([user._id, user.bindUserId])
    }).count()
    
    const momentsResult = await db.collection('moments')
      .where({
        userId: db.command.in([user._id, user.bindUserId])
      })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取用户信息
    const userIds = [user._id, user.bindUserId]
    const usersResult = await db.collection('users')
      .where({
        _id: db.command.in(userIds)
      })
      .field({
        _id: true,
        nickName: true,
        avatarUrl: true
      })
      .get()
    
    // 构建用户信息映射
    const userMap = {}
    usersResult.data.forEach(u => {
      userMap[u._id] = {
        nickName: u.nickName,
        avatarUrl: u.avatarUrl
      }
    })
    
    // 为动态添加用户信息
    const moments = momentsResult.data.map(moment => {
      return {
        ...moment,
        userInfo: userMap[moment.userId] || {}
      }
    })
    
    return {
      success: true,
      moments: moments,
      total: totalResult.total,
      currentPage: page,
      pageSize: pageSize,
      totalPages: Math.ceil(totalResult.total / pageSize)
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}