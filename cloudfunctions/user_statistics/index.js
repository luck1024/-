// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 获取用户统计信息
    const statResult = await db.collection('user_statistics').where({
      userId: user._id
    }).get()
    
    let stats = {
      totalMoments: 0,
      totalPhotos: 0,
      totalLetters: 0,
      totalDiaries: 0,
      completedTasks: 0,
      streakDays: 0
    }
    
    if (statResult.data.length > 0) {
      const stat = statResult.data[0]
      stats = {
        totalMoments: stat.totalMoments || 0,
        totalPhotos: stat.totalPhotos || 0,
        totalLetters: stat.totalLetters || 0,
        totalDiaries: stat.totalDiaries || 0,
        completedTasks: stat.completedTasks || 0,
        streakDays: stat.streakDays || 0
      }
    } else {
      // 创建新的统计记录
      await db.collection('user_statistics').add({
        data: {
          userId: user._id,
          ...stats,
          lastActive: db.serverDate(),
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    }
    
    // 获取伴侣统计信息
    let partnerStats = null
    if (user.bindUserId) {
      const partnerStatResult = await db.collection('user_statistics').where({
        userId: user.bindUserId
      }).get()
      
      if (partnerStatResult.data.length > 0) {
        const partnerStat = partnerStatResult.data[0]
        partnerStats = {
          totalMoments: partnerStat.totalMoments || 0,
          totalPhotos: partnerStat.totalPhotos || 0,
          totalLetters: partnerStat.totalLetters || 0,
          totalDiaries: partnerStat.totalDiaries || 0,
          completedTasks: partnerStat.completedTasks || 0,
          streakDays: partnerStat.streakDays || 0
        }
      }
    }
    
    // 获取互动统计
    const momentsCount = await db.collection('moments').where({
      userId: user._id
    }).count()
    
    const commentsAgg = await db.collection('moments')
      .aggregate()
      .match({
        userId: user._id
      })
      .unwind('$comments')
      .group({
        _id: null,
        total: db.command.aggregate.sum(1)
      })
      .end()
    
    const likesAgg = await db.collection('moments')
      .aggregate()
      .match({
        userId: user._id
      })
      .project({
        likesCount: db.command.aggregate.size('$likes')
      })
      .group({
        _id: null,
        total: db.command.aggregate.sum('$likesCount')
      })
      .end()
    
    const lettersCount = await db.collection('letters').where({
      $or: [
        { fromUserId: user._id },
        { toUserId: user._id }
      ]
    }).count()
    
    const tasksCount = await db.collection('tasks').where({
      userId: user._id
    }).count()
    
    const completedTasksCount = await db.collection('tasks').where({
      userId: user._id,
      status: 'completed'
    }).count()
    
    const taskCompletionRate = tasksCount.total > 0 
      ? (completedTasksCount.total / tasksCount.total * 100).toFixed(1) 
      : '0.0'
    
    return {
      success: true,
      userStats: stats,
      partnerStats: partnerStats,
      interactionStats: {
        totalMoments: momentsCount.total,
        totalComments: commentsAgg.list[0]?.total || 0,
        totalLikes: likesAgg.list[0]?.total || 0,
        totalLetters: lettersCount.total,
        totalTasks: tasksCount.total,
        taskCompletionRate: taskCompletionRate
      }
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}