// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { title, content, images, deliveryTime } = event
  
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
      return { success: false, message: '您还没有绑定伴侣，无法发送信件' }
    }
    
    if (!title || !content) {
      return { success: false, message: '标题和内容不能为空' }
    }
    
    // 获取伴侣信息
    const partnerResult = await db.collection('users').doc(user.bindUserId).get()
    if (!partnerResult.data) {
      return { success: false, message: '伴侣信息不存在' }
    }
    
    // 创建信件数据
    const letterData = {
      fromUserId: user._id,
      toUserId: user.bindUserId,
      title: title,
      content: content,
      images: images || [],
      isRead: false,
      isScheduled: !!deliveryTime,
      deliveryTime: deliveryTime ? new Date(deliveryTime) : db.serverDate(),
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const result = await db.collection('letters').add({
      data: letterData
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
            totalLetters: 1,
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
            totalLetters: db.command.inc(1),
            lastActive: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      }
    } catch (statErr) {
      console.error('更新统计失败', statErr)
    }
    
    // 如果不是定时发送，立即发送通知
    if (!deliveryTime) {
      await db.collection('notifications').add({
        data: {
          userId: user.bindUserId,
          type: 'letter',
          content: `${user.nickName || '您的伴侣'}给您发送了一封信: ${title}`,
          isRead: false,
          relatedId: result._id,
          createTime: db.serverDate()
        }
      })
    }
    
    return {
      success: true,
      letterId: result._id,
      message: deliveryTime ? '信件已安排发送' : '发送成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}