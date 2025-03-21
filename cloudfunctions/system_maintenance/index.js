// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, adminKey } = event
  
  // 简单的管理员验证
  const ADMIN_KEY = 'your_admin_key_here' // 请替换为您的实际管理员密钥
  if (adminKey !== ADMIN_KEY) {
    return { success: false, message: '无权操作' }
  }
  
  try {
    if (action === 'cleanExpiredNotifications') {
      // 清理30天前的通知
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const result = await db.collection('notifications').where({
        createTime: db.command.lt(thirtyDaysAgo)
      }).remove()
      
      return {
        success: true,
        removedCount: result.stats.removed,
        message: `成功清理 ${result.stats.removed} 条过期通知`
      }
    } else if (action === 'updateUserStatistics') {
      // 更新所有用户的统计数据
      const userResult = await db.collection('users').get()
      
      for (const user of userResult.data) {
        // 计算动态数量
        const momentsCount = await db.collection('moments').where({
          userId: user._id
        }).count()
        
        // 计算照片数量
        const photosCount = await db.collection('albums').where({
          userId: user._id
        }).count()
        
        // 计算情书数量
        const lettersCount = await db.collection('letters').where({
          fromUserId: user._id
        }).count()
        
        // 计算日记数量
        const diariesCount = await db.collection('diaries').where({
          userId: user._id
        }).count()
        
        // 更新或创建统计记录
        const statResult = await db.collection('user_statistics').where({
          userId: user._id
        }).get()
        
        if (statResult.data.length === 0) {
          await db.collection('user_statistics').add({
            data: {
              userId: user._id,
              totalMoments: momentsCount.total,
              totalPhotos: photosCount.total,
              totalLetters: lettersCount.total,
              totalDiaries: diariesCount.total,
              lastActive: user.updateTime || db.serverDate(),
              updateTime: db.serverDate()
            }
          })
        } else {
          await db.collection('user_statistics').doc(statResult.data[0]._id).update({
            data: {
              totalMoments: momentsCount.total,
              totalPhotos: photosCount.total,
              totalLetters: lettersCount.total,
              totalDiaries: diariesCount.total,
              updateTime: db.serverDate()
            }
          })
        }
      }
      
      return {
        success: true,
        updatedCount: userResult.data.length,
        message: `成功更新 ${userResult.data.length} 位用户的统计数据`
      }
    } else if (action === 'checkOverdueTasks') {
      // 检查并标记过期任务
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const result = await db.collection('tasks').where({
        status: 'pending',
        deadline: db.command.lt(today)
      }).update({
        data: {
          status: 'overdue',
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        updatedCount: result.stats.updated,
        message: `成功标记 ${result.stats.updated} 个过期任务`
      }
    }
    
    return { success: false, message: '不支持的操作' }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}