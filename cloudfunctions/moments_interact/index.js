// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { momentId, action, content } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const userId = userResult.data[0]._id
    
    // 验证动态是否存在
    const momentResult = await db.collection('moments').doc(momentId).get()
    if (!momentResult.data) {
      return { success: false, message: '动态不存在' }
    }
    
    if (action === 'like') {
      // 检查是否已点赞
      const likeExists = momentResult.data.likes.includes(userId)
      
      if (likeExists) {
        // 取消点赞
        await db.collection('moments').doc(momentId).update({
          data: {
            likes: db.command.pull(userId)
          }
        })
        
        return { success: true, action: 'unlike', message: '取消点赞成功' }
      } else {
        // 添加点赞
        await db.collection('moments').doc(momentId).update({
          data: {
            likes: db.command.push(userId)
          }
        })
        
        // 发送通知（如果不是自己的动态）
        if (momentResult.data.userId !== userId) {
          await db.collection('notifications').add({
            data: {
              userId: momentResult.data.userId,
              type: 'like',
              content: `${userResult.data[0].nickName || '有人'}点赞了你的动态`,
              isRead: false,
              relatedId: momentId,
              createTime: db.serverDate()
            }
          })
        }
        
        return { success: true, action: 'like', message: '点赞成功' }
      }
    } else if (action === 'comment') {
      if (!content) {
        return { success: false, message: '评论内容不能为空' }
      }
      
      // 添加评论
      const comment = {
        userId: userId,
        userInfo: {
          nickName: userResult.data[0].nickName || '',
          avatarUrl: userResult.data[0].avatarUrl || ''
        },
        content: content,
        time: db.serverDate()
      }
      
      await db.collection('moments').doc(momentId).update({
        data: {
          comments: db.command.push(comment)
        }
      })
      
      // 发送通知（如果不是自己的动态）
      if (momentResult.data.userId !== userId) {
        await db.collection('notifications').add({
          data: {
            userId: momentResult.data.userId,
            type: 'comment',
            content: `${userResult.data[0].nickName || '有人'}评论了你的动态: ${content.substring(0, 20)}${content.length > 20 ? '...' : ''}`,
            isRead: false,
            relatedId: momentId,
            createTime: db.serverDate()
          }
        })
      }
      
      return { 
        success: true, 
        comment: comment,
        message: '评论成功' 
      }
    }
    
    return { success: false, message: '不支持的操作' }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}