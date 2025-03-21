// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { momentId } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const currentUser = userResult.data[0]
    
    // 获取动态详情
    const momentResult = await db.collection('moments').doc(momentId).get()
    if (!momentResult.data) {
      return { success: false, message: '动态不存在' }
    }
    
    const moment = momentResult.data
    
    // 验证查看权限
    if (moment.userId !== currentUser._id && moment.userId !== currentUser.bindUserId) {
      return { success: false, message: '无权查看此动态' }
    }
    
    // 获取动态作者信息
    const authorResult = await db.collection('users').doc(moment.userId).get()
    
    // 获取评论用户信息
    const commentUserIds = [...new Set(moment.comments?.map(c => c.userId) || [])]
    let commentUsers = {}
    
    if (commentUserIds.length > 0) {
      const commentUsersResult = await db.collection('users')
        .where({
          _id: db.command.in(commentUserIds)
        })
        .field({
          _id: true,
          nickName: true,
          avatarUrl: true
        })
        .get()
      
      commentUsersResult.data.forEach(u => {
        commentUsers[u._id] = {
          nickName: u.nickName,
          avatarUrl: u.avatarUrl
        }
      })
    }
    
    // 为评论添加用户信息
    const commentsWithUserInfo = (moment.comments || []).map(comment => {
      return {
        ...comment,
        userInfo: commentUsers[comment.userId] || {},
        isOwner: comment.userId === currentUser._id
      }
    })
    
    // 标记是否已点赞
    const isLiked = (moment.likes || []).includes(currentUser._id)
    
    return {
      success: true,
      moment: {
        ...moment,
        comments: commentsWithUserInfo,
        userInfo: {
          nickName: authorResult.data.nickName,
          avatarUrl: authorResult.data.avatarUrl
        },
        isOwner: moment.userId === currentUser._id,
        isLiked: isLiked
      }
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}