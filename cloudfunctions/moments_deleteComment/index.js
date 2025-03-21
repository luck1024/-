// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { commentId } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 获取评论信息
    const commentResult = await db.collection('moment_comments').doc(commentId).get()
    if (!commentResult.data) {
      return { success: false, message: '评论不存在' }
    }
    
    const comment = commentResult.data
    
    // 获取动态信息
    const momentResult = await db.collection('moments').doc(comment.momentId).get()
    if (!momentResult.data) {
      return { success: false, message: '动态不存在' }
    }
    
    const moment = momentResult.data
    
    // 验证权限（评论作者或动态作者可以删除评论）
    if (comment.userId !== user._id && moment.userId !== user._id) {
      return { success: false, message: '无权删除此评论' }
    }
    
    // 删除评论
    await db.collection('moment_comments').doc(commentId).remove()
    
    // 更新动态评论数
    await db.collection('moments').doc(comment.momentId).update({
      data: {
        commentsCount: db.command.inc(-1),
        updateTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      message: '评论删除成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}