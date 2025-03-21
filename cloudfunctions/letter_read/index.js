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
    
    // 验证信件接收者
    const letterResult = await db.collection('letters').doc(letterId).get()
    if (!letterResult.data) {
      return { success: false, message: '信件不存在' }
    }
    
    if (letterResult.data.toUserId !== userResult.data[0]._id) {
      return { success: false, message: '无权查看此信件' }
    }
    
    // 标记为已读
    await db.collection('letters').doc(letterId).update({
      data: {
        isRead: true
      }
    })
    
    // 更新通知状态
    await db.collection('notifications').where({
      relatedId: letterId,
      type: 'letter'
    }).update({
      data: {
        isRead: true
      }
    })
    
    return {
      success: true,
      letter: letterResult.data,
      message: '已标记为已读'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}