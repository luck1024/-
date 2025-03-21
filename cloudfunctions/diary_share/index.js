// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { diaryId, isShared } = event
  
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
      return { success: false, message: '无权操作此日记' }
    }
    
    // 检查是否有伴侣
    if (isShared && !user.bindUserId) {
      return { success: false, message: '您还没有绑定伴侣，无法分享' }
    }
    
    // 更新分享状态
    await db.collection('diaries').doc(diaryId).update({
      data: {
        isShared: isShared === true,
        updateTime: db.serverDate()
      }
    })
    
    // 如果是新分享，发送通知给伴侣
    if (isShared && user.bindUserId && !diaryResult.data.isShared) {
      await db.collection('notifications').add({
        data: {
          userId: user.bindUserId,
          type: 'diary',
          content: `${user.nickName || '您的伴侣'}分享了一篇日记: ${diaryResult.data.title || '日记'}`,
          isRead: false,
          relatedId: diaryId,
          createTime: db.serverDate()
        }
      })
    }
    
    return {
      success: true,
      message: isShared ? '分享成功' : '已取消分享'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}