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
    
    if (statResult.data.length === 0) {
      // 创建新的统计记录
      const newStat = {
        userId: user._id,
        totalMoments: 0,
        totalPhotos: 0,
        totalLetters: 0,
        totalDiaries: 0,
        completedTasks: 0,
        streakDays: 1, // 首次登录，连续天数为1
        lastActive: db.serverDate(),
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
      
      await db.collection('user_statistics').add({
        data: newStat
      })
      
      return {
        success: true,
        streakDays: 1,
        isNewStreak: true,
        message: '首次登录，连续打卡1天'
      }
    } else {
      const stat = statResult.data[0]
      const lastActive = new Date(stat.lastActive)
      const today = new Date()
      
      // 计算日期差
      lastActive.setHours(0, 0, 0, 0)
      today.setHours(0, 0, 0, 0)
      
      const diffTime = Math.abs(today - lastActive)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      let streakDays = stat.streakDays || 0
      let isNewStreak = false
      
      if (diffDays === 0) {
        // 今天已经登录过，不增加连续天数
        return {
          success: true,
          streakDays: streakDays,
          isNewStreak: false,
          message: `今日已打卡，连续${streakDays}天`
        }
      } else if (diffDays === 1) {
        // 昨天登录过，连续天数+1
        streakDays += 1
        isNewStreak = true
      } else {
        // 超过1天没登录，重置连续天数
        streakDays = 1
        isNewStreak = true
      }
      
      // 更新统计信息
      await db.collection('user_statistics').doc(stat._id).update({
        data: {
          streakDays: streakDays,
          lastActive: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        streakDays: streakDays,
        isNewStreak: isNewStreak,
        message: isNewStreak 
          ? `打卡成功，连续${streakDays}天` 
          : `今日已打卡，连续${streakDays}天`
      }
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}