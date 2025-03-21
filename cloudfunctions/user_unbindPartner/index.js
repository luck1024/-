// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 检查用户是否已绑定伴侣
    if (!user.bindUserId) {
      return { success: false, message: '您还没有绑定伴侣' }
    }
    
    // 获取伴侣信息
    const partnerResult = await db.collection('users').doc(user.bindUserId).get()
      .catch(() => ({ data: null }))
    
    // 更新当前用户的绑定状态
    await db.collection('users').doc(user._id).update({
      data: {
        bindUserId: '',
        bindTime: null,
        updateTime: db.serverDate()
      }
    })
    
    // 如果伴侣存在，更新伴侣的绑定状态
    if (partnerResult.data) {
      await db.collection('users').doc(partnerResult.data._id).update({
        data: {
          bindUserId: '',
          bindTime: null,
          updateTime: db.serverDate()
        }
      })
      
      // 发送通知给伴侣
      await db.collection('notifications').add({
        data: {
          userId: partnerResult.data._id,
          type: 'unbind',
          content: `${user.nickName || '您的伴侣'}已解除与您的绑定关系`,
          isRead: false,
          relatedId: user._id,
          createTime: db.serverDate()
        }
      })
    }
    
    return {
      success: true,
      message: '解绑成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}