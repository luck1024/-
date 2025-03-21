// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { confirmCode } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    if (!user.bindUserId) {
      return { success: false, message: '您还没有绑定伴侣' }
    }
    
    // 简单的确认码验证，实际应用中可能需要更复杂的验证
    if (!confirmCode || confirmCode !== 'CONFIRM_UNBIND') {
      return { success: false, message: '确认码错误，请输入 CONFIRM_UNBIND 以确认解绑' }
    }
    
    // 获取伴侣信息
    const partnerResult = await db.collection('users').doc(user.bindUserId).get()
    if (!partnerResult.data) {
      return { success: false, message: '伴侣信息不存在' }
    }
    
    const partner = partnerResult.data
    
    // 获取情侣关系
    const coupleResult = await db.collection('couples').where({
      $or: [
        { userIdA: user._id, userIdB: partner._id },
        { userIdA: partner._id, userIdB: user._id }
      ]
    }).get()
    
    // 更新情侣关系状态
    if (coupleResult.data.length > 0) {
      await db.collection('couples').doc(coupleResult.data[0]._id).update({
        data: {
          status: 'inactive',
          endDate: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    }
    
    // 更新用户绑定状态
    await db.collection('users').doc(user._id).update({
      data: {
        bindUserId: '',
        bindTime: null,
        updateTime: db.serverDate()
      }
    })
    
    await db.collection('users').doc(partner._id).update({
      data: {
        bindUserId: '',
        bindTime: null,
        updateTime: db.serverDate()
      }
    })
    
    // 发送通知给伴侣
    await db.collection('notifications').add({
      data: {
        userId: partner._id,
        type: 'system',
        content: `${user.nickName || '您的伴侣'}已解除与您的绑定关系`,
        isRead: false,
        createTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      message: '解绑成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}