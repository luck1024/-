// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { title, content, mood, weather, location, images, isShared } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    if (!content) {
      return { success: false, message: '日记内容不能为空' }
    }
    
    const diaryData = {
      userId: user._id,
      title: title || '日记',
      content: content,
      mood: mood || '',
      weather: weather || '',
      location: location || null,
      images: images || [],
      isShared: isShared === true && user.bindUserId ? true : false,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const result = await db.collection('diaries').add({
      data: diaryData
    })
    
    // 如果是共享日记，发送通知给伴侣
    if (diaryData.isShared && user.bindUserId) {
      await db.collection('notifications').add({
        data: {
          userId: user.bindUserId,
          type: 'diary',
          content: `${user.nickName || '您的伴侣'}分享了一篇日记: ${title || '日记'}`,
          isRead: false,
          relatedId: result._id,
          createTime: db.serverDate()
        }
      })
    }
    
    // 更新用户统计
    try {
      const statResult = await db.collection('user_statistics').where({
        userId: user._id
      }).get()
      
      if (statResult.data.length === 0) {
        // 创建统计记录
        await db.collection('user_statistics').add({
          data: {
            userId: user._id,
            totalDiaries: 1,
            streakDays: 1,
            lastDiaryDate: db.serverDate(),
            lastActive: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      } else {
        // 检查是否是连续写日记
        const lastDiaryDate = statResult.data[0].lastDiaryDate
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        
        const lastDate = new Date(lastDiaryDate)
        lastDate.setHours(0, 0, 0, 0)
        
        let streakDays = statResult.data[0].streakDays || 0
        
        // 如果上次写日记是昨天，连续天数+1
        if (lastDate.getTime() === yesterday.getTime()) {
          streakDays += 1
        } 
        // 如果上次写日记是今天，连续天数不变
        else if (lastDate.getTime() !== today.getTime()) {
          streakDays = 1
        }
        
        await db.collection('user_statistics').doc(statResult.data[0]._id).update({
          data: {
            totalDiaries: db.command.inc(1),
            streakDays: streakDays,
            lastDiaryDate: db.serverDate(),
            lastActive: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      }
    } catch (statErr) {
      console.error('更新统计失败', statErr)
    }
    
    return {
      success: true,
      diaryId: result._id,
      message: '保存成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}