// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

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
    
    if (!user.bindUserId) {
      return { success: false, message: '您还没有绑定伴侣' }
    }
    
    // 获取伴侣信息
    const partnerResult = await db.collection('users').doc(user.bindUserId).get()
    if (!partnerResult.data) {
      return { success: false, message: '伴侣信息不存在' }
    }
    
    const partner = partnerResult.data
    
    // 获取情侣关系
    const coupleResult = await db.collection('couples').where({
      $or: [
        { userIdA: user._id, userIdB: partner._id },
        { userIdA: partner._id, userIdB: user._id }
      ]
    }).get()
    
    if (coupleResult.data.length === 0) {
      return { success: false, message: '情侣关系不存在' }
    }
    
    const couple = coupleResult.data[0]
    
    // 计算在一起的天数
    const anniversary = user.anniversary || couple.startDate
    const today = new Date()
    const togetherDays = Math.floor((today - new Date(anniversary)) / (1000 * 60 * 60 * 24))
    
    // 获取用户统计
    const userStatResult = await db.collection('user_statistics').where({
      userId: user._id
    }).get()
    
    const partnerStatResult = await db.collection('user_statistics').where({
      userId: partner._id
    }).get()
    
    const userStat = userStatResult.data[0] || {}
    const partnerStat = partnerStatResult.data[0] || {}
    
    // 计算互动统计
    // 1. 动态数量
    const momentsCount = await db.collection('moments').where({
      userId: db.command.in([user._id, partner._id])
    }).count()
    
    // 2. 评论数量
    const commentsCount = await db.collection('moments').aggregate()
      .match({
        userId: db.command.in([user._id, partner._id])
      })
      .project({
        commentsCount: $.size('$comments')
      })
      .group({
        _id: null,
        total: $.sum('$commentsCount')
      })
      .end()
    
    // 3. 点赞数量
    const likesCount = await db.collection('moments').aggregate()
      .match({
        userId: db.command.in([user._id, partner._id])
      })
      .project({
        likesCount: $.size('$likes')
      })
      .group({
        _id: null,
        total: $.sum('$likesCount')
      })
      .end()
    
    // 4. 情书数量
    const lettersCount = await db.collection('letters').where({
      $or: [
        { fromUserId: user._id, toUserId: partner._id },
        { fromUserId: partner._id, toUserId: user._id }
      ]
    }).count()
    
    // 5. 共享任务数量
    const tasksCount = await db.collection('tasks').where({
      isShared: true,
      $or: [
        { userId: user._id, sharedWithUserId: partner._id },
        { userId: partner._id, sharedWithUserId: user._id }
      ]
    }).count()
    
    // 6. 共享任务完成率
    const completedTasksCount = await db.collection('tasks').where({
      isShared: true,
      status: 'completed',
      $or: [
        { userId: user._id, sharedWithUserId: partner._id },
        { userId: partner._id, sharedWithUserId: user._id }
      ]
    }).count()
    
    const taskCompletionRate = tasksCount.total > 0 
      ? (completedTasksCount.total / tasksCount.total * 100).toFixed(1) 
      : 0
    
    return {
      success: true,
      coupleInfo: {
        anniversary: anniversary,
        togetherDays: togetherDays,
        intimacyLevel: couple.intimacyLevel || 1
      },
      userInfo: {
        id: user._id,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        statistics: {
          totalMoments: userStat.totalMoments || 0,
          totalPhotos: userStat.totalPhotos || 0,
          totalLetters: userStat.totalLetters || 0,
          totalDiaries: userStat.totalDiaries || 0,
          streakDays: userStat.streakDays || 0
        }
      },
      partnerInfo: {
        id: partner._id,
        nickName: partner.nickName,
        avatarUrl: partner.avatarUrl,
        statistics: {
          totalMoments: partnerStat.totalMoments || 0,
          totalPhotos: partnerStat.totalPhotos || 0,
          totalLetters: partnerStat.totalLetters || 0,
          totalDiaries: partnerStat.totalDiaries || 0,
          streakDays: partnerStat.streakDays || 0
        }
      },
      interactionStats: {
        totalMoments: momentsCount.total,
        totalComments: commentsCount.list[0]?.total || 0,
        totalLikes: likesCount.list[0]?.total || 0,
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