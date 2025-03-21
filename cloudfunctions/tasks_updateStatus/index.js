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
    
    const user = userResult.data[0]
    
    // 验证任务权限
    const taskResult = await db.collection('tasks').doc(taskId).get()
    if (!taskResult.data) {
      return { success: false, message: '任务不存在' }
    }
    
    const task = taskResult.data
    
    // 验证是否有权限更新任务状态
    if (task.userId !== user._id && task.sharedWithUserId !== user._id) {
      return { success: false, message: '无权更新此任务' }
    }
    
    // 验证状态值
    if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return { success: false, message: '无效的任务状态' }
    }
    
    // 更新任务状态
    await db.collection('tasks').doc(taskId).update({
      data: {
        status: status,
        updateTime: db.serverDate()
      }
    })
    
    // 如果是标记为完成，更新用户统计
    if (status === 'completed' && task.status !== 'completed') {
      try {
        await db.collection('user_statistics').where({
          userId: user._id
        }).update({
          data: {
            completedTasks: db.command.inc(1),
            updateTime: db.serverDate()
          }
        })
      } catch (statErr) {
        console.error('更新统计失败', statErr)
      }
      
      // 如果是共享任务，发送通知给伴侣
      if (task.isShared) {
        const notifyUserId = task.userId === user._id ? task.sharedWithUserId : task.userId
        
        await db.collection('notifications').add({
          data: {
            userId: notifyUserId,
            type: 'task_completed',
            content: `${user.nickName || '您的伴侣'}完成了任务: ${task.title}`,
            isRead: false,
            relatedId: taskId,
            createTime: db.serverDate()
          }
        })
      }
    }
    // 如果是从完成状态改为其他状态，减少完成任务计数
    else if (status !== 'completed' && task.status === 'completed') {
      try {
        await db.collection('user_statistics').where({
          userId: user._id
        }).update({
          data: {
            completedTasks: db.command.inc(-1),
            updateTime: db.serverDate()
          }
        })
      } catch (statErr) {
        console.error('更新统计失败', statErr)
      }
    }
    
    return {
      success: true,
      message: '更新成功'
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}