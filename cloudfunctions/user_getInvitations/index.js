// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { status } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 构建查询条件
    const query = {
      inviterId: user._id
    }
    
    if (status) {
      query.status = status
    }
    
    // 获取邀请列表
    const invitationsResult = await db.collection('partner_invitations')
      .where(query)
      .orderBy('createTime', 'desc')
      .get()
    
    // 处理过期但状态仍为pending的邀请
    const now = new Date()
    const invitations = invitationsResult.data.map(invitation => {
      if (invitation.status === 'pending' && new Date(invitation.expireTime) < now) {
        invitation.status = 'expired'
      }
      return invitation
    })
    
    // 更新已过期的邀请状态
    const expiredInvitations = invitations.filter(
      inv => inv.status === 'expired' && inv._id
    )
    
    if (expiredInvitations.length > 0) {
      for (const inv of expiredInvitations) {
        await db.collection('partner_invitations').doc(inv._id).update({
          data: {
            status: 'expired',
            updateTime: db.serverDate()
          }
        })
      }
    }
    
    return {
      success: true,
      invitations: invitations
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}