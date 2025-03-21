// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { photoId, categoryId, action } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    // 验证照片所有权
    const photoResult = await db.collection('albums').doc(photoId).get()
    if (!photoResult.data) {
      return { success: false, message: '照片不存在' }
    }
    
    if (photoResult.data.userId !== userResult.data[0]._id) {
      return { success: false, message: '无权操作此照片' }
    }
    
    if (action === 'move') {
      // 验证分类是否存在
      if (categoryId) {
        const categoryResult = await db.collection('albums_category').doc(categoryId).get()
        if (!categoryResult.data) {
          return { success: false, message: '分类不存在' }
        }
      }
      
      // 更新旧分类的照片数量
      if (photoResult.data.categoryId) {
        await db.collection('albums_category').doc(photoResult.data.categoryId).update({
          data: {
            count: db.command.inc(-1),
            updateTime: db.serverDate()
          }
        })
      }
      
      // 更新新分类的照片数量
      if (categoryId) {
        await db.collection('albums_category').doc(categoryId).update({
          data: {
            count: db.command.inc(1),
            updateTime: db.serverDate()
          }
        })
      }
      
      // 更新照片分类
      await db.collection('albums').doc(photoId).update({
        data: {
          categoryId: categoryId || '',
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        message: '移动成功'
      }
    } else if (action === 'delete') {
      // 更新分类照片数量
      if (photoResult.data.categoryId) {
        await db.collection('albums_category').doc(photoResult.data.categoryId).update({
          data: {
            count: db.command.inc(-1),
            updateTime: db.serverDate()
          }
        })
      }
      
      // 删除照片
      await db.collection('albums').doc(photoId).remove()
      
      // 更新用户统计
      await db.collection('user_statistics').where({
        userId: userResult.data[0]._id
      }).update({
        data: {
          totalPhotos: db.command.inc(-1),
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        message: '删除成功'
      }
    }
    
    return { success: false, message: '不支持的操作' }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}