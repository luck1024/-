// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { taskId } = event
  
  try {
    // 获取当前用户
    const userResult = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    if (userResult.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const user = userResult.data[0]
    
    // 获取任务详情
    const taskResult = await db.collection('tasks').doc(taskId).get()
    if (!taskResult.data) {
      return { success: false, message: '任务不存在' }
    }
    
    const task = taskResult.data
    
    // 验证查看权限
    if (task.userId !== user._id && task.sharedWithUserId !== user._id) {
      return { success: false, message: '无权查看此任务' }
    }
    
    // 获取创建者信息
    const creatorResult = await db.collection('users').doc(task.userId).get()
    
    // 获取共享用户信息
    let sharedWithUserInfo = null
    if (task.sharedWithUserId) {
      const sharedWithUserResult = await db.collection('users').doc(task.sharedWithUserId).get()
      sharedWithUserInfo = {
        nickName: sharedWithUserResult.data.nickName,
        avatarUrl: sharedWithUserResult.data.avatarUrl
      }
    }
    
    return {
      success: true,
      task: {
        ...task,
        userInfo: {
          nickName: creatorResult.data.nickName,
          avatarUrl: creatorResult.data.avatarUrl
        },
        sharedWithUserInfo: sharedWithUserInfo,
        isOwner: task.userId === user._id,
        isSharedWithMe: task.sharedWithUserId === user._id
      }
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err.message }
  }
}