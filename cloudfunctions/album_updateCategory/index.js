// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { categoryId, name, cover } = event
  
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
    
    // 检查分类名是否重复
    if (name && name !== categoryResult.data.name) {
      const existingCategory = await db.collection('albums_category').where({
        userId: userResult.data[0]._id,
        name: name
      }).get()
      
      if (existingCategory.data.length > 0) {
        return { success: false, message: '分类名称已存在' }
      }
    }
    
    // 更新分类
    const updateData = {}
    if (name) updateData.name = name
    if (cover) updateData.cover = cover
    updateData.updateTime = db.serverDate()
    
    await db.collection('albums_category').doc(categoryId).update({
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