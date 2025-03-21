// app.js

App({


  onLaunch: async function() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-6g8lgqdl3c80888d',  // 替换为你的环境ID
        traceUser: true,
      });
    }

    // 尝试恢复登录状态
    try {
      // 检查本地存储中是否有用户数据
      const userData = wx.getStorageSync('userData');
      if (userData) {
        this.globalData.userInfo = userData;
        this.globalData.openid = userData._openid;
      } else {
        // 如果没有本地数据，尝试获取 openid
        const { result } = await wx.cloud.callFunction({
          name: 'login'
        });
        
        if (result.openid) {
          this.globalData.openid = result.openid;
          
          // 获取用户信息
          const db = wx.cloud.database();
          const userResult = await db.collection('users').where({
            _openid: result.openid
          }).get();

          if (userResult.data.length > 0) {
            const userInfo = userResult.data[0];
            this.globalData.userInfo = userInfo;
            // 保存到本地存储
            wx.setStorageSync('userData', userInfo);
          } else {
            // 未找到用户信息，需要重新登录
            wx.redirectTo({
              url: '/pages/auth/login/login'
            });
          }
        }
      }
    } catch (err) {
      console.error('恢复登录状态失败:', err);
    }

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },
  
  // 检查登录状态
  checkSession: async function() {
    try {
      // 检查登录态是否过期
      await wx.checkSession();
      
      // 检查是否有用户数据
      if (this.globalData.userInfo && this.globalData.openid) {
        return true;
      }
      
      // 尝试从本地存储恢复
      const userData = wx.getStorageSync('userData');
      if (userData) {
        this.globalData.userInfo = userData;
        this.globalData.openid = userData._openid;
        return true;
      }

      return false;
    } catch (err) {
      console.error('登录态已过期');
      return false;
    }
  },
  
  globalData: {
    userInfo: null,
      openid: null,
    userData: null,
    isLoggedIn: false,
    icons: {
      // TabBar 图标
      home: 'https://img.icons8.com/fluency/48/home.png',
      homeActive: 'https://img.icons8.com/fluency-systems-filled/48/home.png',
      tasks: 'https://img.icons8.com/fluency/48/task.png',
      tasksActive: 'https://img.icons8.com/fluency-systems-filled/48/task.png',
      letters: 'https://img.icons8.com/fluency/48/mail.png',
      lettersActive: 'https://img.icons8.com/fluency-systems-filled/48/mail.png',
      profile: 'https://img.icons8.com/fluency/48/user.png',
      profileActive: 'https://img.icons8.com/fluency-systems-filled/48/user.png',
      
      // 功能图标
      share: 'https://img.icons8.com/fluency/48/share.png',
      like: 'https://img.icons8.com/fluency/48/like.png',
      likeActive: 'https://img.icons8.com/fluency-systems-filled/48/like.png',
      comment: 'https://img.icons8.com/fluency/48/comments.png',
      delete: 'https://img.icons8.com/fluency/48/delete.png',
      edit: 'https://img.icons8.com/fluency/48/edit.png'
    },
    
    // 默认图片
    images: {
      logo: 'https://img.icons8.com/fluency/96/love-book.png',
      defaultAvatar: 'https://img.icons8.com/fluency/96/user-neutral.png',
      emptyTasks: 'https://img.icons8.com/fluency/96/empty-box.png',
      emptyLetters: 'https://img.icons8.com/fluency/96/empty-letter.png',
      emptyMoments: 'https://img.icons8.com/fluency/96/empty-calendar.png',
      shareInvite: 'https://img.icons8.com/fluency/96/love-circled.png'
    }
  }
})
