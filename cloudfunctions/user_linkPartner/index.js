// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { bindCode } = event
  
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
    if (user.bindUserId) {
      return { success: false, message: '您已绑定伴侣，如需更换请先解绑' }
    }
    
    if (!bindCode) {
      return { success: false, message: '绑定码不能为空' }
    }
    
    // 查找对应的绑定码
    const bindResult = await db.collection('bind_codes').where({
      code: bindCode,
      isUsed: false,
      expireTime: db.command.gt(db.serverDate())
    }).get()
    
    if (bindResult.data.length === 0) {
      return { success: false, message: '绑定码无效或已过期' }
    }
    
    const bindInfo = bindResult.data[0]
    
    // 检查是否自己的绑定码
    if (bindInfo.userId === user._id) {
      return { success: false, message: '不能使用自己的绑定码' }
    }
    
    // 获取伴侣信息
    const partnerResult = await db.collection('users').doc(bindInfo.userId).get()
    if (!partnerResult.data) {
      return { success: false, message: '伴侣信息不存在' }
    }
    
    const partner = partnerResult.data
    
    // 检查伴侣是否已绑定
    if (partner.bindUserId) {
      return { success: false, message: '对方已绑定伴侣，无法完成绑定' }
    }
    
    // 更新双方的绑定状态
    await db.collection('users').doc(user._id).update({
      data: {
        bindUserId: partner._id,
        bindTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    
    await db.collection('users').doc(partner._id).update({
      data: {
        bindUserId: user._id,
        bindTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    
    // 标记绑定码为已使用
    await db.collection('bind_codes').doc(bindInfo._id).update({
      data: {
        isUsed: true,
        usedTime: db.serverDate(),
        usedBy: user._id,
        updateTime: db.serverDate()
      }
    })
    
    // 发送通知给伴侣
    await db.collection('notifications').add({
      data: {
        userId: partner._id,
        type: 'bind',
        content: `${user.nickName || '新用户'}与您成功绑定为伴侣关系`,
        isRead: false,
        relatedId: user._id,
        createTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      partner: {
        id: partner._id,
        nickName: partner.nickName,
        avatarUrl: partner.avatarUrl
      },
      message: '绑定成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}