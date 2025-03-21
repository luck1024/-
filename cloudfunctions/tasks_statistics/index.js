// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { timeRange } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const userId = userResult.data[0]._id
    
    // 设置时间范围
    let startTime = new Date()
    startTime.setHours(0, 0, 0, 0)
    
    if (timeRange === 'week') {
      // 本周开始时间
      const day = startTime.getDay() || 7
      startTime.setDate(startTime.getDate() - day + 1)
    } else if (timeRange === 'month') {
      // 本月开始时间
      startTime.setDate(1)
    } else if (timeRange === 'year') {
      // 本年开始时间
      startTime.setMonth(0, 1)
    }
    
    // 查询任务统计
    const taskStats = await db.collection('tasks').aggregate()
      .match({
        $or: [
          { userId: userId },
          { sharedWithUserId: userId }
        ],
        createTime: _.gte(startTime)
      })
      .group({
        _id: '$status',
        count: $.sum(1)
      })
      .end()
    
    // 处理统计结果
    const stats = {
      total: 0,
      pending: 0,
      completed: 0,
      overdue: 0
    }
    
    taskStats.list.forEach(item => {
      if (item._id === 'pending') {
        stats.pending = item.count
      } else if (item._id === 'completed') {
        stats.completed = item.count
      } else if (item._id === 'overdue') {
        stats.overdue = item.count
      }
      stats.total += item.count
    })
    
    // 查询共享任务完成率
    const sharedTaskStats = await db.collection('tasks').aggregate()
      .match({
        isShared: true,
        $or: [
          { userId: userId },
          { sharedWithUserId: userId }
        ],
        createTime: _.gte(startTime)
      })
      .group({
        _id: '$status',
        count: $.sum(1)
      })
      .end()
    
    const sharedStats = {
      total: 0,
      completed: 0
    }
    
    sharedTaskStats.list.forEach(item => {
      sharedStats.total += item.count
      if (item._id === 'completed') {
        sharedStats.completed = item.count
      }
    })
    
    return {
      success: true,
      stats: stats,
      sharedStats: sharedStats,
      completionRate: stats.total > 0 ? (stats.completed / stats.total * 100).toFixed(1) : 0,
      sharedCompletionRate: sharedStats.total > 0 ? (sharedStats.completed / sharedStats.total * 100).toFixed(1) : 0
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}