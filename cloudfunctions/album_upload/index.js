// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { title, description, imageUrl, location, categoryId, tags } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    if (!imageUrl) {
      return { success: false, message: '图片不能为空' }
    }
    
    const photoData = {
      userId: userResult.data[0]._id,
      title: title || '',
      description: description || '',
      imageUrl: imageUrl,
      location: location || null,
      categoryId: categoryId || '',
      tags: tags || [],
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const result = await db.collection('albums').add({
      data: photoData
    })
    
    // 更新分类照片数量
    if (categoryId) {
      await db.collection('albums_category').doc(categoryId).update({
        data: {
          count: db.command.inc(1),
          updateTime: db.serverDate()
        }
      })
    }
    
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
            totalMoments: 0,
            totalPhotos: 1,
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
            totalPhotos: db.command.inc(1),
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
      photoId: result._id,
      message: '上传成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}