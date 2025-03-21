// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { name, cover } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    if (!name) {
      return { success: false, message: '分类名称不能为空' }
    }
    
    // 检查分类名是否重复
    const existingCategory = await db.collection('albums_category').where({
      userId: user._id,
      name: name
    }).get()
    
    if (existingCategory.data.length > 0) {
      return { success: false, message: '分类名称已存在' }
    }
    
    // 创建分类
    const categoryData = {
      userId: user._id,
      name: name,
      cover: cover || '',
      count: 0,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const result = await db.collection('albums_category').add({
      data: categoryData
    })
    
    return {
      success: true,
      categoryId: result._id,
      message: '创建成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}