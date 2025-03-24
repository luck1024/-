// 云函数入口文件
const cloud = require('wx-server-sdk')
const db = cloud.database()

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    // 先查询用户是否有未使用的邀请码
    const existingCodes = await db.collection('inviteCodes')
      .where({
        creatorId: OPENID,
        used: false,
        expired: false,
        expireTime: db.command.gt(new Date())
      })
      .get()
    
    // 如果有未使用的邀请码，将它们标记为过期
    if (existingCodes.data && existingCodes.data.length > 0) {
      // 批量更新所有旧的邀请码为已过期
      const oldCodeIds = existingCodes.data.map(code => code._id)
      
      // 云函数中不支持直接批量更新，需要用循环逐个更新
      for (const codeId of oldCodeIds) {
        await db.collection('inviteCodes').doc(codeId).update({
          data: {
            expired: true,
            expireTime: new Date() // 立即过期
          }
        })
      }
    }
    
    // 生成6位随机邀请码
    const inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase()
    
    // 将新邀请码存入数据库，确保包含expired字段
    const result = await db.collection('inviteCodes').add({
      data: {
        code: inviteCode,
        creatorId: OPENID,
        used: false,
        expired: false,
        createTime: db.serverDate(),
        expireTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
        _createTime: db.serverDate(),
        _updateTime: db.serverDate()
      }
    })
    
    // 返回结果
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