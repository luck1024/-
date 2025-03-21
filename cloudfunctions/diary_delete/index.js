// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { diaryId } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    // 验证日记所有权
    const diaryResult = await db.collection('diaries').doc(diaryId).get()
    if (!diaryResult.data) {
      return { success: false, message: '日记不存在' }
    }
    
    if (diaryResult.data.userId !== userResult.data[0]._id) {
      return { success: false, message: '无权删除此日记' }
    }
    
    // 删除日记
    await db.collection('diaries').doc(diaryId).remove()
    
    // 删除相关通知
    if (diaryResult.data.isShared) {
      await db.collection('notifications').where({
        relatedId: diaryId,
        type: 'diary'
      }).remove()
    }
    
    // 更新用户统计
    try {
      await db.collection('user_statistics').where({
        userId: userResult.data[0]._id
      }).update({
        data: {
          totalDiaries: db.command.inc(-1),
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