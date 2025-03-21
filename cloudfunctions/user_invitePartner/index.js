// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 生成随机邀请码
function generateRandomCode(length = 8) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { inviteeName, inviteePhone, message } = event
  
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
      return { success: false, message: '您已绑定伴侣，无需发送邀请' }
    }
    
    if (!inviteeName) {
      return { success: false, message: '被邀请人姓名不能为空' }
    }
    
    // 生成邀请码
    let inviteCode;
    let isUnique = false;
    
    // 确保生成的邀请码是唯一的
    while (!isUnique) {
      inviteCode = generateRandomCode();
      const codeCheck = await db.collection('partner_invitations').where({
        inviteCode: inviteCode,
        status: 'pending',
        expireTime: db.command.gt(db.serverDate())
      }).count();
      
      if (codeCheck.total === 0) {
        isUnique = true;
      }
    }
    
    // 设置过期时间（7天后）
    const expireTime = new Date();
    expireTime.setDate(expireTime.getDate() + 7);
    
    // 创建邀请记录
    const invitationData = {
      inviterId: user._id,
      inviterName: user.nickName || '爱人',
      inviteeName: inviteeName,
      inviteePhone: inviteePhone || '',
      message: message || `我想邀请你加入"爱情日记"小程序，和我一起记录我们的美好时光。`,
      inviteCode: inviteCode,
      status: 'pending',
      expireTime: expireTime,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const result = await db.collection('partner_invitations').add({
      data: invitationData
    })
    
    // 生成邀请链接
    const inviteLink = `https://lovediaryapp.com/invite?code=${inviteCode}`;
    
    // 如果配置了短信服务，可以在这里发送短信
    // 这里仅返回邀请码和链接，由前端处理分享逻辑
    
    return {
      success: true,
      invitationId: result._id,
      inviteCode: inviteCode,
      inviteLink: inviteLink,
      expireTime: expireTime,
      message: '邀请创建成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}