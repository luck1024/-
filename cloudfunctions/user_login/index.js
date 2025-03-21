// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const users = db.collection('users')

// 云函数入口函数
exports.main = async (event, context) => {
  const { OPENID, APPID } = cloud.getWXContext()
  const { userInfo } = event
  
  try {
    // 查询用户是否已存在
    const user = await users.where({
      _openid: OPENID
    }).get()
    
    if (user.data.length === 0) {
      // 新用户，创建用户记录
      const newUser = {
        _openid: OPENID,
        appid: APPID,
        nickName: userInfo.nickName || '',
        avatarUrl: userInfo.avatarUrl || '',
        gender: userInfo.gender || 0,
        country: userInfo.country || '',
        province: userInfo.province || '',
        city: userInfo.city || '',
        bindUserId: '', // 绑定的情侣id
        bindTime: null, // 绑定时间
        anniversary: null, // 恋爱纪念日
        createTime: db.serverDate(), // 创建时间
        settings: {
          notifications: true,
          sound: true,
          vibration: true,
          dailyReminder: false,
          reminderTime: '20:00',
          theme: 'light'
        }
      }
      
      const result = await users.add({
        data: newUser
      })
      
      return {
        success: true,
        message: '注册成功',
        data: {
          ...newUser,
          _id: result._id
        }
      }
    } else {
      // 老用户，更新用户信息
      const userData = user.data[0]
      
      // 只在用户信息有变化时更新
      if (userInfo.nickName !== userData.nickName || 
          userInfo.avatarUrl !== userData.avatarUrl || 
          userInfo.gender !== userData.gender) {
        await users.doc(userData._id).update({
          data: {
            nickName: userInfo.nickName || userData.nickName,
            avatarUrl: userInfo.avatarUrl || userData.avatarUrl,
            gender: userInfo.gender || userData.gender,
            country: userInfo.country || userData.country,
            province: userInfo.province || userData.province,
            city: userInfo.city || userData.city
          }
        })
      }
      
      return {
        success: true,
        message: '登录成功',
        data: {
          ...userData,
          nickName: userInfo.nickName || userData.nickName,
          avatarUrl: userInfo.avatarUrl || userData.avatarUrl,
          gender: userInfo.gender || userData.gender,
          country: userInfo.country || userData.country,
          province: userInfo.province || userData.province,
          city: userInfo.city || userData.city
        }
      }
    }
  } catch (err) {
    console.error('[用户登录]', err)
    return {
      success: false,
      message: '登录失败',
      error: err
    }
  }
}