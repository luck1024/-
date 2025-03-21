// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { nickName, avatarUrl, gender, birthday, anniversary, interests } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    // 更新用户资料
    const updateData = {
      updateTime: db.serverDate()
    }
    
    if (nickName !== undefined) updateData.nickName = nickName
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
    if (gender !== undefined) updateData.gender = gender
    if (birthday !== undefined) updateData.birthday = birthday ? new Date(birthday) : null
    if (anniversary !== undefined) updateData.anniversary = anniversary ? new Date(anniversary) : null
    if (interests !== undefined) updateData.interests = interests
    
    await db.collection('users').doc(userResult.data[0]._id).update({
      data: updateData
    })
    
    // 如果有伴侣，更新伴侣的纪念日
    if (anniversary !== undefined && userResult.data[0].bindUserId) {
      await db.collection('users').doc(userResult.data[0].bindUserId).update({
        data: {
          anniversary: anniversary ? new Date(anniversary) : null,
          updateTime: db.serverDate()
        }
      })
    }
    
    return {
      success: true,
      message: '资料更新成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}