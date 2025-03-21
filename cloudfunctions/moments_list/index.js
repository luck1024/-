// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { page = 1, pageSize = 10, userId } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 构建查询条件
    let query = {}
    
    if (userId) {
      // 查询指定用户的动态
      query.userId = userId
      
      // 如果不是查询自己的动态，需要验证是否是伴侣关系
      if (userId !== user._id && userId !== user.bindUserId) {
        return { success: false, message: '无权查看此用户的动态' }
      }
    } else {
      // 查询自己和伴侣的动态
      if (user.bindUserId) {
        query.$or = [
          { userId: user._id },
          { userId: user.bindUserId }
        ]
      } else {
        query.userId = user._id
      }
    }
    
    // 获取动态总数
    const totalResult = await db.collection('moments')
      .where(query)
      .count()
    
    // 获取动态列表
    const momentsResult = await db.collection('moments')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取用户信息
    const userIds = [...new Set(momentsResult.data.map(item => item.userId))]
    const usersResult = await db.collection('users').where({
      _id: db.command.in(userIds)
    }).get()
    
    const usersMap = {}
    usersResult.data.forEach(user => {
      usersMap[user._id] = {
        nickName: user.nickName,
        avatarUrl: user.avatarUrl
      }
    })
    
    // 组装返回数据
    const moments = momentsResult.data.map(moment => {
      return {
        ...moment,
        user: usersMap[moment.userId] || { nickName: '未知用户', avatarUrl: '' },
        isOwner: moment.userId === user._id
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