// 云函数入口文件
const cloud = require('wx-server-sdk')
const db = cloud.database()

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const { inviteCode } = event
  const { OPENID } = cloud.getWXContext()
  
  try {
    // 查询邀请码
    const codeResult = await db.collection('inviteCodes')
      .where({
        code: inviteCode,
        used: false,
        expireTime: db.command.gt(new Date())
      })
      .get()
    
    if (codeResult.data.length === 0) {
      return {
        success: false,
        message: '邀请码无效或已过期'
      }
    }
    
    // 获取邀请者信息
    const inviter = await db.collection('users')
      .where({
        _openid: codeResult.data[0].creatorId
      })
      .get()
    
    if (inviter.data.length === 0) {
      return {
        success: false,
        message: '邀请者不存在'
      }
    }
    
    return {
      success: true,
      inviter: {
        nickName: inviter.data[0].nickName,
        avatarUrl: inviter.data[0].avatarUrl,
        gender: inviter.data[0].gender
      }
    }
  } catch (err) {
    console.error('[验证邀请码]', err)
    return {
      success: false,
      message: '验证邀请码失败'
    }
  }
}