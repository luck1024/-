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
    
    const currentUser = userResult.data[0]
    
    // 构建查询条件
    let query = {}
    
    if (userId) {
      // 查询特定用户的动态
      query.userId = userId
      
      // 如果不是查询自己的动态，需要验证是否有权限查看
      if (userId !== currentUser._id) {
        // 检查是否是伴侣关系
        if (userId !== currentUser.bindUserId) {
          return { success: false, message: '无权查看此用户的动态' }
        }
      }
    } else {
      // 查询自己和伴侣的动态
      if (currentUser.bindUserId) {
        query.userId = db.command.in([currentUser._id, currentUser.bindUserId])
      } else {
        query.userId = currentUser._id
      }
    }
    
    // 获取动态总数
    const totalResult = await db.collection('moments').where(query).count()
    
    // 分页获取动态
    const momentsResult = await db.collection('moments')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取用户信息
    const userIds = [...new Set(momentsResult.data.map(m => m.userId))]
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
        userInfo: userMap[moment.userId] || {},
        isOwner: moment.userId === currentUser._id
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