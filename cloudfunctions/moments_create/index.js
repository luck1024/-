// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { content, images, location } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const momentData = {
      userId: userResult.data[0]._id,
      content: content || '',
      images: images || [],
      location: location || null,
      likes: [],
      comments: [],
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const result = await db.collection('moments').add({
      data: momentData
    })
    
    // 更新用户统计
    try {
      const statResult = await db.collection('user_statistics').where({
        userId: userResult.data[0]._id
      }).get()
      
      if (statResult.data.length === 0) {
        // 创建统计记录
        await db.collection('user_statistics').add({
          data: {
            userId: userResult.data[0]._id,
            totalMoments: 1,
            totalPhotos: 0,
            totalLetters: 0,
            streakDays: 0,
            lastActive: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      } else {
        // 更新统计
        await db.collection('user_statistics').doc(statResult.data[0]._id).update({
          data: {
            totalMoments: db.command.inc(1),
            lastActive: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      }
    } catch (statErr) {
      console.error('更新统计失败', statErr)
    }
    
    return {
      success: true,
      momentId: result._id,
      message: '发布成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}