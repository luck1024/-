// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
    if (!user.bindUserId) {
      return { success: false, message: '您还没有绑定伴侣' }
    }
    
    // 获取伴侣信息
    const partnerResult = await db.collection('users').doc(user.bindUserId).get()
      .catch(() => ({ data: null }))
    
    if (!partnerResult.data) {
      return { success: false, message: '伴侣信息不存在' }
    }
    
    const partner = partnerResult.data
    
    // 获取伴侣统计信息
    const partnerStatResult = await db.collection('user_statistics').where({
      userId: partner._id
    }).get()
    
    let partnerStats = null
    if (partnerStatResult.data.length > 0) {
      const stat = partnerStatResult.data[0]
      partnerStats = {
        totalMoments: stat.totalMoments || 0,
        totalPhotos: stat.totalPhotos || 0,
        totalLetters: stat.totalLetters || 0,
        totalDiaries: stat.totalDiaries || 0,
        completedTasks: stat.completedTasks || 0,
        streakDays: stat.streakDays || 0
      }
    }
    
    // 计算绑定天数
    const bindDays = user.bindTime 
      ? Math.floor((new Date() - new Date(user.bindTime)) / (1000 * 60 * 60 * 24)) + 1
      : 0
    
    return {
      success: true,
      partner: {
        id: partner._id,
        nickName: partner.nickName,
        avatarUrl: partner.avatarUrl,
        gender: partner.gender,
        birthday: partner.birthday,
        interests: partner.interests || [],
        bindTime: user.bindTime,
        bindDays: bindDays
      },
      partnerStats: partnerStats
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}