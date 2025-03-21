// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
    
    const inviterId = codeResult.data[0].creatorId
    const now = db.serverDate()
    
    // 更新双方的绑定状态
    await Promise.all([
      // 更新当前用户
      db.collection('users').where({
        _openid: OPENID
      }).update({
        data: {
          bindUserId: inviterId,
          bindTime: now
        }
      }),
      // 更新邀请者
      db.collection('users').where({
        _openid: inviterId
      }).update({
        data: {
          bindUserId: OPENID,
          bindTime: now
        }
      }),
      // 标记邀请码已使用
      db.collection('inviteCodes').doc(codeResult.data[0]._id).update({
        data: {
          used: true,
          useTime: now
        }
      })
    ])
    
    return {
      success: true,
      message: '绑定成功'
    }
  } catch (err) {
    console.error('[接受邀请]', err)
    return {
      success: false,
      message: '绑定失败'
    }
  }
}