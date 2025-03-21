// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { categoryId, moveToCategory } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    // 验证分类所有权
    const categoryResult = await db.collection('albums_category').doc(categoryId).get()
    if (!categoryResult.data) {
      return { success: false, message: '分类不存在' }
    }
    
    if (categoryResult.data.userId !== userResult.data[0]._id) {
      return { success: false, message: '无权操作此分类' }
    }
    
    // 如果指定了移动目标分类，验证目标分类
    if (moveToCategory) {
      const targetCategoryResult = await db.collection('albums_category').doc(moveToCategory).get()
      if (!targetCategoryResult.data) {
        return { success: false, message: '目标分类不存在' }
      }
      
      if (targetCategoryResult.data.userId !== userResult.data[0]._id) {
        return { success: false, message: '无权操作目标分类' }
      }
      
      // 移动照片到目标分类
      await db.collection('albums').where({
        userId: userResult.data[0]._id,
        categoryId: categoryId
      }).update({
        data: {
          categoryId: moveToCategory,
          updateTime: db.serverDate()
        }
      })
      
      // 更新目标分类的照片数量
      const movedCount = categoryResult.data.count || 0
      await db.collection('albums_category').doc(moveToCategory).update({
        data: {
          count: db.command.inc(movedCount),
          updateTime: db.serverDate()
        }
      })
    } else {
      // 将照片设为未分类
      await db.collection('albums').where({
        userId: userResult.data[0]._id,
        categoryId: categoryId
      }).update({
        data: {
          categoryId: '',
          updateTime: db.serverDate()
        }
      })
    }
    
    // 删除分类
    await db.collection('albums_category').doc(categoryId).remove()
    
    return {
      success: true,
      message: '删除成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}