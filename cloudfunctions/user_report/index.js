// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { targetId, targetType, reason, description } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    if (!targetId || !targetType || !reason) {
      return { success: false, message: '举报信息不完整' }
    }
    
    // 验证举报类型
    const validTypes = ['moment', 'comment', 'user', 'diary', 'letter']
    if (!validTypes.includes(targetType)) {
      return { success: false, message: '无效的举报类型' }
    }
    
    // 创建举报记录
    const reportData = {
      userId: user._id,
      userNickName: user.nickName || '',
      targetId: targetId,
      targetType: targetType,
      reason: reason,
      description: description || '',
      status: 'pending',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    await db.collection('reports').add({
      data: reportData
    })
    
    return {
      success: true,
      message: '举报提交成功，我们会尽快处理'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}