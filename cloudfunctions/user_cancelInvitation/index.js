// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { invitationId } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 验证邀请所有权
    const invitationResult = await db.collection('partner_invitations').doc(invitationId).get()
    if (!invitationResult.data) {
      return { success: false, message: '邀请不存在' }
    }
    
    const invitation = invitationResult.data
    
    if (invitation.inviterId !== user._id) {
      return { success: false, message: '无权取消此邀请' }
    }
    
    if (invitation.status !== 'pending') {
      return { success: false, message: '只能取消待处理的邀请' }
    }
    
    // 更新邀请状态
    await db.collection('partner_invitations').doc(invitationId).update({
      data: {
        status: 'cancelled',
        updateTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      message: '邀请已取消'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}