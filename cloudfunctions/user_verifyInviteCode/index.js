// 云函数入口文件
const cloud = require('wx-server-sdk')
const db = cloud.database()

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const { inviteCode } = event
  const wxContext = cloud.getWXContext()
  const OPENID = wxContext.OPENID
  
  try {
    // 查询邀请码
    const codeResult = await db.collection('inviteCodes')
      .where({
        code: inviteCode,
        used: false,
        expired: false,
        expireTime: db.command.gt(new Date())
      })
      .orderBy('createTime', 'desc') // 确保获取最新的邀请码
      .limit(1)
      .get()
    
    if (codeResult.data.length === 0) {
      return {
        success: false,
        message: '邀请码无效或已过期'
      }
    }
    
    const inviteInfo = codeResult.data[0]
    
    // 检查是否是自己的邀请码
    if (inviteInfo.creatorId === OPENID) {
      return {
        success: false,
        message: '不能使用自己的邀请码'
      }
    }
    
    // 查询邀请者信息
    const userResult = await db.collection('users')
      .where({
        _openid: inviteInfo.creatorId
      })
      .get()
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        message: '邀请者信息不存在'
      }
    }
    
    const inviter = userResult.data[0]
    
    return {
      success: true,
      inviteCode,
      inviteId: inviteInfo._id,
      inviter: {
        _openid: inviter._openid,
        nickName: inviter.nickName,
        avatarUrl: inviter.avatarUrl,
        gender: inviter.gender || '未知'
      }
    }
  } catch (err) {
    console.error('[验证邀请码]', err)
    return {
      success: false,
      message: '验证邀请码失败',
      error: err
    }
  }
}