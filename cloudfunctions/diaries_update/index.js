// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { diaryId, title, content, mood, weather, location, images, isShared } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 验证日记所有权
    const diaryResult = await db.collection('diaries').doc(diaryId).get()
    if (!diaryResult.data) {
      return { success: false, message: '日记不存在' }
    }
    
    if (diaryResult.data.userId !== user._id) {
      return { success: false, message: '无权修改此日记' }
    }
    
    // 更新日记
    const updateData = {
      updateTime: db.serverDate()
    }
    
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (mood !== undefined) updateData.mood = mood
    if (weather !== undefined) updateData.weather = weather
    if (location !== undefined) updateData.location = location
    if (images !== undefined) updateData.images = images
    
    // 只有绑定了伴侣才能分享
    if (isShared !== undefined) {
      updateData.isShared = isShared === true && user.bindUserId ? true : false
    }
    
    await db.collection('diaries').doc(diaryId).update({
      data: updateData
    })
    
    // 如果是新分享，发送通知给伴侣
    if (isShared === true && user.bindUserId && !diaryResult.data.isShared) {
      await db.collection('notifications').add({
        data: {
          userId: user.bindUserId,
          type: 'diary',
          content: `${user.nickName || '您的伴侣'}分享了一篇日记: ${title || diaryResult.data.title}`,
          isRead: false,
          relatedId: diaryId,
          createTime: db.serverDate()
        }
      })
    }
    
    return {
      success: true,
      message: '更新成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}