// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { photoId } = event
  
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
      return { success: false, message: '无权删除此照片' }
    }
    
    // 删除云存储中的文件
    try {
      await cloud.deleteFile({
        fileList: [photoResult.data.fileID]
      })
    } catch (fileErr) {
      console.error('删除文件失败', fileErr)
    }
    
    // 更新分类照片数量
    if (photoResult.data.categoryId) {
      await db.collection('albums_category').doc(photoResult.data.categoryId).update({
        data: {
          count: db.command.inc(-1),
          updateTime: db.serverDate()
        }
      }).catch(err => console.error('更新分类失败', err))
    }
    
    // 删除照片记录
    await db.collection('albums').doc(photoId).remove()
    
    // 更新用户统计
    try {
      await db.collection('user_statistics').where({
        userId: user._id
      }).update({
        data: {
          totalPhotos: db.command.inc(-1),
          updateTime: db.serverDate()
        }
      })
    } catch (statErr) {
      console.error('更新统计失败', statErr)
    }
    
    return {
      success: true,
      message: '删除成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}