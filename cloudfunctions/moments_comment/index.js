// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { momentId, content, commentId, action } = event
  
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
    
    // 添加评论
    if (action === 'add') {
      if (!content) {
        return { success: false, message: '评论内容不能为空' }
      }
      
      const commentData = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user._id,
        content: content,
        createTime: db.serverDate()
      }
      
      await db.collection('moments').doc(momentId).update({
        data: {
          comments: db.command.push(commentData),
          updateTime: db.serverDate()
        }
      })
      
      // 如果不是自己的动态，发送通知
      if (moment.userId !== user._id) {
        await db.collection('notifications').add({
          data: {
            userId: moment.userId,
            type: 'comment',
            content: `${user.nickName || '您的伴侣'}评论了您的动态: ${content.substr(0, 20)}${content.length > 20 ? '...' : ''}`,
            isRead: false,
            relatedId: momentId,
            createTime: db.serverDate()
          }
        })
      }
      
      return {
        success: true,
        commentId: commentData.id,
        message: '评论成功'
      }
    } 
    // 删除评论
    else if (action === 'delete') {
      if (!commentId) {
        return { success: false, message: '评论ID不能为空' }
      }
      
      // 查找评论
      const comments = moment.comments || []
      const commentIndex = comments.findIndex(c => c.id === commentId)
      
      if (commentIndex === -1) {
        return { success: false, message: '评论不存在' }
      }
      
      // 验证评论所有权
      if (comments[commentIndex].userId !== user._id && moment.userId !== user._id) {
        return { success: false, message: '无权删除此评论' }
      }
      
      // 删除评论
      comments.splice(commentIndex, 1)
      
      await db.collection('moments').doc(momentId).update({
        data: {
          comments: comments,
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        message: '删除评论成功'
      }
    }
    
    return { success: false, message: '不支持的操作' }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}