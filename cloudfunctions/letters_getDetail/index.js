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
    
    // 获取信件详情
    const letterResult = await db.collection('letters').doc(letterId).get()
    if (!letterResult.data) {
      return { success: false, message: '信件不存在' }
    }
    
    const letter = letterResult.data
    
    // 验证查看权限
    if (letter.fromUserId !== user._id && letter.toUserId !== user._id) {
      return { success: false, message: '无权查看此信件' }
    }
    
    // 获取发件人和收件人信息
    const fromUserResult = await db.collection('users').doc(letter.fromUserId).get()
    const toUserResult = await db.collection('users').doc(letter.toUserId).get()
    
    // 如果是收件人查看，标记为已读
    if (letter.toUserId === user._id && !letter.isRead) {
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
    }
    
    return {
      success: true,
      letter: {
        ...letter,
        fromUserInfo: {
          nickName: fromUserResult.data.nickName,
          avatarUrl: fromUserResult.data.avatarUrl
        },
        toUserInfo: {
          nickName: toUserResult.data.nickName,
          avatarUrl: toUserResult.data.avatarUrl
        },
        isSender: letter.fromUserId === user._id,
        isReceiver: letter.toUserId === user._id
      }
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}