// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { page = 1, pageSize = 20, status, type, includePartner = false } = event
  
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
    
    if (includePartner && user.bindUserId) {
      query.$or = [
        { userId: user._id },
        { userId: user.bindUserId, sharedWithUserId: user._id }
      ]
    } else {
      query.userId = user._id
    }
    
    if (status) {
      query.status = status
    }
    
    if (type) {
      query.type = type
    }
    
    // 获取任务总数
    const totalResult = await db.collection('tasks').where(query).count()
    
    // 分页获取任务
    const tasksResult = await db.collection('tasks')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取用户信息
    const userIds = [...new Set([
      ...tasksResult.data.map(t => t.userId),
      ...tasksResult.data.filter(t => t.sharedWithUserId).map(t => t.sharedWithUserId)
    ])]
    
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
    
    // 为任务添加用户信息
    const tasks = tasksResult.data.map(task => {
      return {
        ...task,
        userInfo: userMap[task.userId] || {},
        sharedWithUserInfo: task.sharedWithUserId ? userMap[task.sharedWithUserId] || {} : null,
        isOwner: task.userId === user._id,
        isSharedWithMe: task.sharedWithUserId === user._id
      }
    })
    
    return {
      success: true,
      tasks: tasks,
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