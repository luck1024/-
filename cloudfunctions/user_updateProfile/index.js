// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { nickName, avatarUrl, gender, anniversary } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const updateData = {}
    if (nickName) updateData.nickName = nickName
    if (avatarUrl) updateData.avatarUrl = avatarUrl
    if (gender !== undefined) updateData.gender = gender
    if (anniversary) updateData.anniversary = new Date(anniversary)
    updateData.updateTime = db.serverDate()
    
    await db.collection('users').doc(userResult.data[0]._id).update({
      data: updateData
    })
    
    // 如果有伴侣且修改了纪念日，同步更新couple表
    if (anniversary && userResult.data[0].bindUserId) {
      const coupleResult = await db.collection('couples').where({
        $or: [
          { userIdA: userResult.data[0]._id },
          { userIdB: userResult.data[0]._id }
        ]
      }).get()
      
      if (coupleResult.data.length > 0) {
        await db.collection('couples').doc(coupleResult.data[0]._id).update({
          data: {
            startDate: new Date(anniversary),
            updateTime: db.serverDate()
          }
        })
      }
    }
    
    return {
      success: true,
      message: '更新成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}