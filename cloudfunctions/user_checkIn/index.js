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
    
    // 获取用户签到记录
    const checkInResult = await db.collection('user_check_in').where({
      userId: user._id
    }).orderBy('checkInDate', 'desc').limit(1).get()
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 检查今天是否已签到
    if (checkInResult.data.length > 0) {
      const lastCheckIn = new Date(checkInResult.data[0].checkInDate)
      lastCheckIn.setHours(0, 0, 0, 0)
      
      if (lastCheckIn.getTime() === today.getTime()) {
        return { success: false, message: '今天已经签到过了' }
      }
    }
    
    // 添加签到记录
    await db.collection('user_check_in').add({
      data: {
        userId: user._id,
        checkInDate: db.serverDate(),
        createTime: db.serverDate()
      }
    })
    
    // 更新用户统计
    let streakDays = 1
    let isNewStreak = true
    
    if (checkInResult.data.length > 0) {
      const lastCheckIn = new Date(checkInResult.data[0].checkInDate)
      lastCheckIn.setHours(0, 0, 0, 0)
      
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      if (lastCheckIn.getTime() === yesterday.getTime()) {
        // 昨天签到过，连续天数+1
        const statResult = await db.collection('user_statistics').where({
          userId: user._id
        }).get()
        
        if (statResult.data.length > 0) {
          streakDays = (statResult.data[0].streakDays || 0) + 1
          
          await db.collection('user_statistics').doc(statResult.data[0]._id).update({
            data: {
              streakDays: streakDays,
              lastActive: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
        } else {
          // 创建新的统计记录
          await db.collection('user_statistics').add({
            data: {
              userId: user._id,
              totalMoments: 0,
              totalPhotos: 0,
              totalLetters: 0,
              totalDiaries: 0,
              completedTasks: 0,
              streakDays: 1,
              lastActive: db.serverDate(),
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
        }
      } else {
        // 不是连续签到，重置连续天数为1
        const statResult = await db.collection('user_statistics').where({
          userId: user._id
        }).get()
        
        if (statResult.data.length > 0) {
          await db.collection('user_statistics').doc(statResult.data[0]._id).update({
            data: {
              streakDays: 1,
              lastActive: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
        } else {
          // 创建新的统计记录
          await db.collection('user_statistics').add({
            data: {
              userId: user._id,
              totalMoments: 0,
              totalPhotos: 0,
              totalLetters: 0,
              totalDiaries: 0,
              completedTasks: 0,
              streakDays: 1,
              lastActive: db.serverDate(),
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
        }
      }
    } else {
      // 首次签到
      const statResult = await db.collection('user_statistics').where({
        userId: user._id
      }).get()
      
      if (statResult.data.length > 0) {
        await db.collection('user_statistics').doc(statResult.data[0]._id).update({
          data: {
            streakDays: 1,
            lastActive: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      } else {
        // 创建新的统计记录
        await db.collection('user_statistics').add({
          data: {
            userId: user._id,
            totalMoments: 0,
            totalPhotos: 0,
            totalLetters: 0,
            totalDiaries: 0,
            completedTasks: 0,
            streakDays: 1,
            lastActive: db.serverDate(),
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      }
    }
    
    return {
      success: true,
      streakDays: streakDays,
      isNewStreak: isNewStreak,
      message: `签到成功，已连续签到${streakDays}天`
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}