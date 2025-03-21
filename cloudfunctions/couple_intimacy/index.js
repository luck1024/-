// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action } = event
  
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
    
    // 获取情侣关系
    const coupleResult = await db.collection('couples').where({
      $or: [
        { userIdA: user._id, userIdB: user.bindUserId },
        { userIdA: user.bindUserId, userIdB: user._id }
      ],
      status: 'active'
    }).get()
    
    if (coupleResult.data.length === 0) {
      return { success: false, message: '情侣关系不存在或已失效' }
    }
    
    const couple = coupleResult.data[0]
    
    if (action === 'calculate') {
      // 计算亲密度
      let intimacyScore = 0
      
      // 1. 基础分数：在一起的天数
      const anniversary = user.anniversary || couple.startDate
      const today = new Date()
      const togetherDays = Math.floor((today - new Date(anniversary)) / (1000 * 60 * 60 * 24))
      intimacyScore += Math.min(togetherDays, 365) * 0.1 // 最多加36.5分
      
      // 2. 互动分数
      // 2.1 动态互动
      const momentsCount = await db.collection('moments').where({
        userId: db.command.in([user._id, user.bindUserId])
      }).count()
      intimacyScore += Math.min(momentsCount.total, 100) * 0.1 // 最多加10分
      
      // 2.2 评论互动
      const commentsCount = await db.collection('moments').aggregate()
        .match({
          userId: db.command.in([user._id, user.bindUserId])
        })
        .project({
          commentsCount: db.command.aggregate.size('$comments')
        })
        .group({
          _id: null,
          total: db.command.aggregate.sum('$commentsCount')
        })
        .end()
      
      intimacyScore += Math.min(commentsCount.list[0]?.total || 0, 200) * 0.05 // 最多加10分
      
      // 2.3 情书互动
      const lettersCount = await db.collection('letters').where({
        $or: [
          { fromUserId: user._id, toUserId: user.bindUserId },
          { fromUserId: user.bindUserId, toUserId: user._id }
        ]
      }).count()
      
      intimacyScore += Math.min(lettersCount.total, 50) * 0.2 // 最多加10分
      
      // 2.4 共享任务完成
      const tasksCount = await db.collection('tasks').where({
        isShared: true,
        status: 'completed',
        $or: [
          { userId: user._id, sharedWithUserId: user.bindUserId },
          { userId: user.bindUserId, sharedWithUserId: user._id }
        ]
      }).count()
      
      intimacyScore += Math.min(tasksCount.total, 50) * 0.2 // 最多加10分
      
      // 2.5 共享日记
      const diariesCount = await db.collection('diaries').where({
        isShared: true,
        userId: db.command.in([user._id, user.bindUserId])
      }).count()
      
      intimacyScore += Math.min(diariesCount.total, 50) * 0.2 // 最多加10分
      
      // 计算亲密等级 (1-10)
      const intimacyLevel = Math.min(Math.max(Math.floor(intimacyScore / 10) + 1, 1), 10)
      
      // 更新情侣关系的亲密度
      await db.collection('couples').doc(couple._id).update({
        data: {
          intimacyLevel: intimacyLevel,
          intimacyScore: intimacyScore,
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        intimacyScore: intimacyScore.toFixed(1),
        intimacyLevel: intimacyLevel,
        nextLevelScore: (intimacyLevel * 10).toFixed(1),
        progress: ((intimacyScore % 10) / 10 * 100).toFixed(1)
      }
    } else if (action === 'get') {
      // 获取当前亲密度
      return {
        success: true,
        intimacyScore: couple.intimacyScore || 0,
        intimacyLevel: couple.intimacyLevel || 1,
        nextLevelScore: ((couple.intimacyLevel || 1) * 10).toFixed(1),
        progress: (((couple.intimacyScore || 0) % 10) / 10 * 100).toFixed(1)
      }
    }
    
    return { success: false, message: '不支持的操作' }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}