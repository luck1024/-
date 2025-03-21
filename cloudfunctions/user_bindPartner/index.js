// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { partnerId, anniversary } = event
  
  try {
    // 验证伴侣ID是否存在
    const partnerResult = await db.collection('users').doc(partnerId).get()
    if (!partnerResult.data) {
      return { success: false, message: '伴侣ID不存在' }
    }
    
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 创建情侣关系
    const coupleData = {
      userIdA: user._id,
      userIdB: partnerId,
      status: 'active',
      startDate: anniversary ? new Date(anniversary) : db.serverDate(),
      intimacyLevel: 1,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const coupleResult = await db.collection('couples').add({
      data: coupleData
    })
    
    // 更新双方用户的绑定状态
    await db.collection('users').doc(user._id).update({
      data: {
        bindUserId: partnerId,
        bindTime: db.serverDate(),
        anniversary: anniversary ? new Date(anniversary) : db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    
    await db.collection('users').doc(partnerId).update({
      data: {
        bindUserId: user._id,
        bindTime: db.serverDate(),
        anniversary: anniversary ? new Date(anniversary) : db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      coupleId: coupleResult._id,
      message: '绑定成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}