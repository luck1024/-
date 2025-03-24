// 云函数入口文件
const cloud = require('wx-server-sdk')
const db = cloud.database()

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    // 先查询用户是否有未使用的邀请码
    const existingCodes = await db.collection('invites')
      .where({
        _openid: OPENID,
        status: 'active',
        expireTime: db.command.gt(new Date())
      })
      .get()
    
    // 如果有未使用的邀请码，将它们标记为过期
    if (existingCodes.data && existingCodes.data.length > 0) {
      for (const code of existingCodes.data) {
        await db.collection('invites').doc(code._id).update({
          data: {
            status: 'expired',
            expireTime: new Date(),
            _updateTime: db.serverDate()
          }
        })
      }
    }
    
    // 生成6位随机邀请码
    const inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase()
    
    // 获取用户信息
    const userResult = await db.collection('users').doc(OPENID).get()
    const userInfo = userResult.data || {}
    
    // 将新邀请码存入数据库，使用正确的字段名
    const result = await db.collection('invites').add({
      data: {
        code: inviteCode,
        _openid: OPENID,
        status: 'active',
        createTime: db.serverDate(),
        expireTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
        acceptUserId: '',
        acceptTime: null,
        userInfo: {
          nickName: userInfo.nickName || '',
          avatarUrl: userInfo.avatarUrl || '',
          gender: userInfo.gender || 0
        }
      }
    })
    
    return {
      success: true,
      inviteCode,
      codeId: result._id,
      expireTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  } catch (err) {
    console.error('[生成邀请码]', err)
    return {
      success: false,
      message: '生成邀请码失败',
      error: err
    }
  }
}