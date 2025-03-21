// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { content, images, location } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    if (!content && (!images || images.length === 0)) {
      return { success: false, message: '内容不能为空' }
    }
    
    const momentData = {
      userId: user._id,
      content: content || '',
      images: images || [],
      location: location || null,
      likes: [],
      comments: [],
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const result = await db.collection('moments').add({
      data: momentData
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
            totalMoments: 1,
            totalPhotos: 0,
            totalLetters: 0,
            totalDiaries: 0,
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
            totalMoments: db.command.inc(1),
            lastActive: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      }
    } catch (statErr) {
      console.error('更新统计失败', statErr)
    }
    
    // 如果有伴侣，发送通知
    if (user.bindUserId) {
      await db.collection('notifications').add({
        data: {
          userId: user.bindUserId,
          type: 'moment',
          content: `${user.nickName || '您的伴侣'}发布了新动态`,
          isRead: false,
          relatedId: result._id,
          createTime: db.serverDate()
        }
      })
    }
    
    return {
      success: true,
      momentId: result._id,
      message: '发布成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}