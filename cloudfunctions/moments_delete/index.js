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
    
    // 验证动态所有权
    const momentResult = await db.collection('moments').doc(momentId).get()
    if (!momentResult.data) {
      return { success: false, message: '动态不存在' }
    }
    
    if (momentResult.data.userId !== userResult.data[0]._id) {
      return { success: false, message: '无权删除此动态' }
    }
    
    // 删除动态
    await db.collection('moments').doc(momentId).remove()
    
    // 删除相关的评论和点赞
    await db.collection('comments').where({
      momentId: momentId
    }).remove()
    
    await db.collection('likes').where({
      momentId: momentId
    }).remove()
    
    // 更新用户统计
    try {
      await db.collection('user_statistics').where({
        userId: userResult.data[0]._id
      }).update({
        data: {
          totalMoments: db.command.inc(-1),
          updateTime: db.serverDate()
        }
      })
    } catch (statErr) {
      console.error('更新统计失败', statErr)
    }
    
    return {
      success: true,
      message: '删除成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}