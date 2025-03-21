// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 生成随机邀请码
function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  console.log('生成邀请码使用的字符集:', chars);
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  console.log('生成的随机邀请码:', result);
  return result;
}

// 生成唯一邀请码
async function generateUniqueCode() {
  let attempts = 0;
  while (attempts < 10) { // 最多尝试10次
    attempts++;
    const code = generateRandomCode();
    console.log(`尝试第 ${attempts} 次生成邀请码:`, code);
    
    // 检查邀请码是否已存在
    const codeCheck = await db.collection('invites').where({
      code: code,
      status: 'active'
    }).count();
    
    if (codeCheck.total === 0) {
      console.log('邀请码未被使用，可以使用');
      return code;
    }
    
    console.log('邀请码已存在，重新生成');
  }
  
  throw new Error('无法生成唯一邀请码，请稍后再试');
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  console.log('云函数开始执行，用户 OPENID:', wxContext.OPENID);
  
  try {
    // 生成唯一邀请码
    const inviteCode = await generateUniqueCode();
    console.log('成功生成唯一邀请码:', inviteCode);
    
    // 保存到数据库
    const result = await db.collection('invites').add({
      data: {
        _openid: wxContext.OPENID,
        code: inviteCode,
        status: 'active',
        createTime: db.serverDate(),
        expireTime: db.serverDate({
          offset: 24 * 60 * 60 * 1000 // 24小时后过期
        })
      }
    });
    
    console.log('邀请码保存结果:', result);
    
    // 返回邀请码
    return { 
      success: true,
      inviteCode: inviteCode 
    };
    
  } catch (err) {
    console.error('云函数执行错误:', err);
    return { 
      success: false,
      error: err.message 
    };
  }
};
