// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { momentId, page = 1, pageSize = 20 } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 验证动态权限
    const momentResult = await db.collection('moments').doc(momentId).get()
    if (!momentResult.data) {
      return { success: false, message: '动态不存在' }
    }
    
    const moment = momentResult.data
    
    // 验证是否有权限查看评论
    if (moment.userId !== user._id && moment.userId !== user.bindUserId) {
      return { success: false, message: '无权查看此动态的评论' }
    }
    
    // 获取评论总数
    const totalResult = await db.collection('moment_comments')
      .where({ momentId: momentId })
      .count()
    
    // 获取评论列表
    const commentsResult = await db.collection('moment_comments')
      .where({ momentId: momentId })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取用户信息
    const userIds = [...new Set(commentsResult.data.map(item => item.userId))]
    const usersResult = await db.collection('users').where({
      _id: db.command.in(userIds)
    }).get()
    
    const usersMap = {}
    usersResult.data.forEach(user => {
      usersMap[user._id] = {
        nickName: user.nickName,
        avatarUrl: user.avatarUrl
      }
    })
    
    // 组装返回数据
    const comments = commentsResult.data.map(comment => {
      return {
        ...comment,
        user: usersMap[comment.userId] || { nickName: '未知用户', avatarUrl: '' },
        isOwner: comment.userId === user._id
      }
    })
    
    return {
      success: true,
      comments: comments,
      total: totalResult.total,
      currentPage: page,
      pageSize: pageSize,
      totalPages: Math.ceil(totalResult.total / pageSize)
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}