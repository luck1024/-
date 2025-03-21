// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { letterId } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    // 验证信件权限
    const letterResult = await db.collection('letters').doc(letterId).get()
    if (!letterResult.data) {
      return { success: false, message: '信件不存在' }
    }
    
    const userId = userResult.data[0]._id
    if (letterResult.data.fromUserId !== userId && letterResult.data.toUserId !== userId) {
      return { success: false, message: '无权删除此信件' }
    }
    
    // 删除信件
    await db.collection('letters').doc(letterId).remove()
    
    // 删除相关通知
    await db.collection('notifications').where({
      relatedId: letterId,
      type: 'letter'
    }).remove()
    
    // 如果是发送者，更新统计
    if (letterResult.data.fromUserId === userId) {
      await db.collection('user_statistics').where({
        userId: userId
      }).update({
        data: {
          totalLetters: db.command.inc(-1),
          updateTime: db.serverDate()
        }
      })
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