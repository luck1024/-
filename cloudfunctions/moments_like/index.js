// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { momentId, action } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 获取动态
    const momentResult = await db.collection('moments').doc(momentId).get()
    if (!momentResult.data) {
      return { success: false, message: '动态不存在' }
    }
    
    const moment = momentResult.data
    
    // 验证查看权限
    if (moment.userId !== user._id && moment.userId !== user.bindUserId) {
      return { success: false, message: '无权操作此动态' }
    }
    
    // 点赞或取消点赞
    if (action === 'like') {
      // 检查是否已点赞
      if (moment.likes && moment.likes.includes(user._id)) {
        return { success: false, message: '您已经点赞过了' }
      }
      
      await db.collection('moments').doc(momentId).update({
        data: {
          likes: db.command.addToSet(user._id),
          updateTime: db.serverDate()
        }
      })
      
      // 如果不是自己的动态，发送通知
      if (moment.userId !== user._id) {
        await db.collection('notifications').add({
          data: {
            userId: moment.userId,
            type: 'like',
            content: `${user.nickName || '您的伴侣'}点赞了您的动态`,
            isRead: false,
            relatedId: momentId,
            createTime: db.serverDate()
          }
        })
      }
      
      return {
        success: true,
        message: '点赞成功'
      }
    } else if (action === 'unlike') {
      // 检查是否已点赞
      if (!moment.likes || !moment.likes.includes(user._id)) {
        return { success: false, message: '您还没有点赞' }
      }
      
      await db.collection('moments').doc(momentId).update({
        data: {
          likes: db.command.pull(user._id),
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        message: '取消点赞成功'
      }
    }
    
    return { success: false, message: '不支持的操作' }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}