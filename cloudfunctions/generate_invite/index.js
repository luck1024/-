// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 生成随机邀请码
function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  
  try {
    // 生成邀请码
    const inviteCode = generateRandomCode();
    console.log('生成的邀请码:', inviteCode);
    throw new Error('abc');
    // 保存到数据库
    await db.collection('invites').add({
      data: {
        _openid: wxContext.OPENID, // 注意这里使用 _openid 而不是 openid
        code: inviteCode,
        status: 'active',
        createTime: db.serverDate(),
        expireTime: db.serverDate({
          offset: 24 * 60 * 60 * 1000 // 24小时后
        })
      }
    });
    
    // 直接返回一个对象，包含邀请码
    return { inviteCode };
    
  } catch (err) {
    console.error('云函数错误:', err);
    return { error: err.message };
  }
}