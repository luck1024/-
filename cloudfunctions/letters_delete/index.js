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
    
    // 验证信件所有权
    const letterResult = await db.collection('letters').doc(letterId).get()
    if (!letterResult.data) {
      return { success: false, message: '信件不存在' }
    }
    
    const letter = letterResult.data
    
    // 只有发件人可以删除未发送的信件，发送后双方都可以删除自己的副本
    if (letter.isScheduled && !letter.deliveryTime) {
      if (letter.fromUserId !== user._id) {
        return { success: false, message: '无权删除此信件' }
      }
      
      // 删除未发送的信件
      await db.collection('letters').doc(letterId).remove()
    } else {
      if (letter.fromUserId !== user._id && letter.toUserId !== user._id) {
        return { success: false, message: '无权删除此信件' }
      }
      
      // 如果是发件人删除
      if (letter.fromUserId === user._id) {
        await db.collection('letters').doc(letterId).update({
          data: {
            isDeletedBySender: true
          }
        })
      }
      // 如果是收件人删除
      else if (letter.toUserId === user._id) {
        await db.collection('letters').doc(letterId).update({
          data: {
            isDeletedByReceiver: true
          }
        })
      }
      
      // 如果双方都删除了，彻底删除信件
      if (
        (letter.isDeletedBySender || letter.fromUserId === user._id) && 
        (letter.isDeletedByReceiver || letter.toUserId === user._id)
      ) {
        await db.collection('letters').doc(letterId).remove()
      }
    }
    
    // 删除相关通知
    await db.collection('notifications').where({
      relatedId: letterId,
      type: 'letter'
    }).remove()
    
    return {
      success: true,
      message: '删除成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}