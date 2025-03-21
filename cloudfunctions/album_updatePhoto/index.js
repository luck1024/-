// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { photoId, description, location, categoryId } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 验证照片所有权
    const photoResult = await db.collection('albums').doc(photoId).get()
    if (!photoResult.data) {
      return { success: false, message: '照片不存在' }
    }
    
    if (photoResult.data.userId !== user._id) {
      return { success: false, message: '无权修改此照片' }
    }
    
    // 验证分类是否存在
    if (categoryId && categoryId !== photoResult.data.categoryId) {
      const categoryResult = await db.collection('albums_category').doc(categoryId).get()
        .catch(() => ({ data: null }))
      
      if (!categoryResult.data) {
        return { success: false, message: '分类不存在' }
      }
      
      if (categoryResult.data.userId !== user._id) {
        return { success: false, message: '无权使用此分类' }
      }
      
      // 更新旧分类的照片数量
      if (photoResult.data.categoryId) {
        await db.collection('albums_category').doc(photoResult.data.categoryId).update({
          data: {
            count: db.command.inc(-1),
            updateTime: db.serverDate()
          }
        }).catch(err => console.error('更新旧分类失败', err))
      }
      
      // 更新新分类的照片数量
      await db.collection('albums_category').doc(categoryId).update({
        data: {
          count: db.command.inc(1),
          updateTime: db.serverDate()
        }
      }).catch(err => console.error('更新新分类失败', err))
    }
    
    // 更新照片信息
    const updateData = {
      updateTime: db.serverDate()
    }
    
    if (description !== undefined) updateData.description = description
    if (location !== undefined) updateData.location = location
    if (categoryId !== undefined) updateData.categoryId = categoryId
    
    await db.collection('albums').doc(photoId).update({
      data: updateData
    })
    
    return {
      success: true,
      message: '更新成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}