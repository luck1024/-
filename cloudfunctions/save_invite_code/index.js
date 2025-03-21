// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { targetOpenid } = event
  
  try {
    // 检查当前用户是否已经绑定伴侣
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length > 0 && userResult.data[0].partnerId) {
      return {
        success: false,
        message: '您已经绑定了伴侣'
      }
    }

    // 生成6位随机邀请码
    const code = Math.random().toString(36).substr(2, 6).toUpperCase()
    
    // 保存邀请码
    await db.collection('invite_codes').add({
      data: {
        code,
        inviterOpenid: wxContext.OPENID,
        targetOpenid: targetOpenid || null,  // 如果没有指定目标用户，则为null
        status: 'unused',
        createTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      code
    }
    
  } catch (err) {
    console.error('生成邀请码失败:', err)
    return {
      success: false,
      message: '生成失败: ' + err.message
    }
  }
}