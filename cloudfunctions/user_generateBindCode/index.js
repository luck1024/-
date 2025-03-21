// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 生成随机绑定码
function generateRandomCode(length = 6) {
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
      return { success: false, message: '您已绑定伴侣，无需生成绑定码' }
    }
    
    // 检查是否有未过期的绑定码
    const existingCodeResult = await db.collection('bind_codes').where({
      userId: user._id,
      isUsed: false,
      expireTime: db.command.gt(db.serverDate())
    }).get()
    
    if (existingCodeResult.data.length > 0) {
      // 返回现有的绑定码
      const existingCode = existingCodeResult.data[0]
      return {
        success: true,
        bindCode: existingCode.code,
        expireTime: existingCode.expireTime,
        isNew: false
      }
    }
    
    // 生成新的绑定码
    let code;
    let isUnique = false;
    
    // 确保生成的绑定码是唯一的
    while (!isUnique) {
      code = generateRandomCode();
      const codeCheck = await db.collection('bind_codes').where({
        code: code,
        isUsed: false,
        expireTime: db.command.gt(db.serverDate())
      }).count();
      
      if (codeCheck.total === 0) {
        isUnique = true;
      }
    }
    
    // 设置过期时间（24小时后）
    const expireTime = new Date();
    expireTime.setHours(expireTime.getHours() + 24);
    
    // 保存绑定码
    const result = await db.collection('bind_codes').add({
      data: {
        userId: user._id,
        code: code,
        isUsed: false,
        expireTime: expireTime,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      bindCode: code,
      expireTime: expireTime,
      isNew: true
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}