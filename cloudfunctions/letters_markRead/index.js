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
    
    const user = userResult.data[0]
    
    // 验证信件权限
    const letterResult = await db.collection('letters').doc(letterId).get()
    if (!letterResult.data) {
      return { success: false, message: '信件不存在' }
    }
    
    const letter = letterResult.data
    
    // 只有收件人可以标记为已读
    if (letter.toUserId !== user._id) {
      return { success: false, message: '无权操作此信件' }
    }
    
    // 标记信件为已读
    await db.collection('letters').doc(letterId).update({
      data: {
        isRead: true,
        updateTime: db.serverDate()
      }
    })
    
    // 标记相关通知为已读
    await db.collection('notifications').where({
      userId: user._id,
      relatedId: letterId,
      type: 'letter'
    }).update({
      data: {
        isRead: true,
        updateTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      message: '信件已标记为已读'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}