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
    
    if (!title || !content) {
      return { success: false, message: '标题和内容不能为空' }
    }
    
    // 创建日记数据
    const diaryData = {
      userId: user._id,
      title: title,
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
    
    // 更新用户统计
    try {
      const statResult = await db.collection('user_statistics').where({
        userId: user._id
      }).get()
      
      if (statResult.data.length === 0) {
        await db.collection('user_statistics').add({
          data: {
            userId: user._id,
            totalMoments: 0,
            totalPhotos: 0,
            totalLetters: 0,
            totalDiaries: 1,
            completedTasks: 0,
            streakDays: 0,
            lastActive: db.serverDate(),
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      } else {
        await db.collection('user_statistics').doc(statResult.data[0]._id).update({
          data: {
            totalDiaries: db.command.inc(1),
            lastActive: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      }
    } catch (statErr) {
      console.error('更新统计失败', statErr)
    }
    
    // 如果是共享日记，发送通知给伴侣
    if (diaryData.isShared && user.bindUserId) {
      await db.collection('notifications').add({
        data: {
          userId: user.bindUserId,
          type: 'diary',
          content: `${user.nickName || '您的伴侣'}分享了一篇日记: ${title}`,
          isRead: false,
          relatedId: result._id,
          createTime: db.serverDate()
        }
      })
    }
    
    return {
      success: true,
      diaryId: result._id,
      message: '创建成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}