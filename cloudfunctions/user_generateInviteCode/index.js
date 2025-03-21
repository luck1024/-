// 云函数入口文件
const cloud = require('wx-server-sdk')
const db = cloud.database()

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  
  try {
    // 生成6位随机邀请码
    const inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase()
    
    // 将邀请码存入数据库
    await db.collection('inviteCodes').add({
      data: {
        code: inviteCode,
        creatorId: OPENID,
        used: false,
        createTime: db.serverDate(),
        expireTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
      }
    })
    
    return {
      success: true,
      inviteCode
    }
  } catch (err) {
    console.error('[生成邀请码]', err)
    return {
      success: false,
      message: '生成邀请码失败'
    }
  }
}