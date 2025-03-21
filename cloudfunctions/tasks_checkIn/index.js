// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { taskId, status } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const userId = userResult.data[0]._id
    
    // 验证任务
    const taskResult = await db.collection('tasks').doc(taskId).get()
    if (!taskResult.data) {
      return { success: false, message: '任务不存在' }
    }
    
    const task = taskResult.data
    
    // 验证权限
    if (task.userId !== userId && task.sharedWithUserId !== userId) {
      return { success: false, message: '无权操作此任务' }
    }
    
    // 更新任务状态
    const updateData = {
      status: status || 'completed',
      updateTime: db.serverDate()
    }
    
    if (status === 'completed') {
      updateData.completedTime = db.serverDate()
    }
    
    await db.collection('tasks').doc(taskId).update({
      data: updateData
    })
    
    // 如果是共享任务，发送通知给伴侣
    if (task.isShared) {
      const notifyUserId = task.userId === userId ? task.sharedWithUserId : task.userId
      
      if (notifyUserId) {
        await db.collection('notifications').add({
          data: {
            userId: notifyUserId,
            type: 'task_update',
            content: `${userResult.data[0].nickName || '您的伴侣'}将任务 "${task.title}" 标记为${status === 'completed' ? '已完成' : '进行中'}`,
            isRead: false,
            relatedId: taskId,
            createTime: db.serverDate()
          }
        })
      }
    }
    
    // 更新用户统计
    if (status === 'completed') {
      try {
        const statResult = await db.collection('user_statistics').where({
          userId: userId
        }).get()
        
        if (statResult.data.length > 0) {
          await db.collection('user_statistics').doc(statResult.data[0]._id).update({
            data: {
              completedTasks: db.command.inc(1),
              lastActive: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
        }
      } catch (statErr) {
        console.error('更新统计失败', statErr)
      }
    }
    
    return {
      success: true,
      message: status === 'completed' ? '任务已完成' : '状态已更新'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}