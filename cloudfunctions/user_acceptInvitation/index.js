// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { inviteCode, inviterOpenid } = event
  const wxContext = cloud.getWXContext()
  const OPENID = wxContext.OPENID
  
  // 开始数据库事务
  const transaction = await db.startTransaction()
  
  try {
    // 再次验证邀请码
    const codeResult = await transaction.collection('inviteCodes')
      .where({
        code: inviteCode,
        used: false,
        expired: false,
        expireTime: db.command.gt(new Date())
      })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()
    
    if (codeResult.data.length === 0) {
      await transaction.rollback()
      return {
        success: false,
        message: '邀请码无效或已过期'
      }
    }
    
    const inviteInfo = codeResult.data[0]
    
    // 确认邀请码创建者是传入的邀请者
    if (inviteInfo.creatorId !== inviterOpenid) {
      await transaction.rollback()
      return {
        success: false,
        message: '邀请码与邀请者不匹配'
      }
    }
    
    // 检查是否是自己的邀请码
    if (inviteInfo.creatorId === OPENID) {
      await transaction.rollback()
      return {
        success: false,
        message: '不能使用自己的邀请码'
      }
    }
    
    // 获取邀请者信息
    const inviterResult = await transaction.collection('users')
      .where({
        _openid: inviterOpenid
      })
      .get()
    
    if (inviterResult.data.length === 0) {
      await transaction.rollback()
      return {
        success: false,
        message: '邀请者信息不存在'
      }
    }
    
    const inviter = inviterResult.data[0]
    
    // 检查邀请者是否已有伴侣
    if (inviter.partnerId) {
      await transaction.rollback()
      return {
        success: false,
        message: '邀请者已绑定其他伴侣'
      }
    }
    
    // 获取当前用户信息
    const userResult = await transaction.collection('users')
      .where({
        _openid: OPENID
      })
      .get()
    
    if (userResult.data.length === 0) {
      await transaction.rollback()
      return {
        success: false,
        message: '请先完成个人信息设置'
      }
    }
    
    const currentUser = userResult.data[0]
    
    // 检查当前用户是否已有伴侣
    if (currentUser.partnerId) {
      await transaction.rollback()
      return {
        success: false,
        message: '您已绑定其他伴侣'
      }
    }
    
    // 1. 更新邀请者信息，添加伴侣
    await transaction.collection('users').doc(inviter._id).update({
      data: {
        partnerId: OPENID,
        partnerNickName: currentUser.nickName,
        partnerAvatarUrl: currentUser.avatarUrl,
        updateTime: db.serverDate()
      }
    })
    
    // 2. 更新当前用户信息，添加伴侣
    await transaction.collection('users').doc(currentUser._id).update({
      data: {
        partnerId: inviterOpenid,
        partnerNickName: inviter.nickName,
        partnerAvatarUrl: inviter.avatarUrl,
        updateTime: db.serverDate()
      }
    })
    
    // 3. 更新邀请码状态
    await transaction.collection('inviteCodes').doc(inviteInfo._id).update({
      data: {
        used: true,
        usedBy: OPENID,
        usedTime: db.serverDate()
      }
    })
    
    // 提交事务
    await transaction.commit()
    
    return {
      success: true,
      message: '绑定成功',
      partnerInfo: {
        _openid: inviter._openid,
        nickName: inviter.nickName,
        avatarUrl: inviter.avatarUrl
      }
    }
  } catch (err) {
    // 回滚事务
    await transaction.rollback()
    console.error('[接受邀请]', err)
    return {
      success: false,
      message: '绑定失败',
      error: err
    }
  }
}