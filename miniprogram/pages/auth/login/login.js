// pages/auth/login/login.js
Page({
  data: {
    isLoading: false
  },

  // 获取用户信息
  async getUserProfile() {
    try {
      this.setData({ isLoading: true });
      
      // 获取用户信息
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善用户资料'
      });
      
      // 获取云开发的登录凭证
      const { code } = await wx.login();
      
      // 调用云函数进行登录
      const result = await wx.cloud.callFunction({
        name: 'user_login',
        data: {
          code,
          userInfo
        }
      });
      
      console.log('登录结果', result);
      
      // 保存完整的返回数据到全局和本地存储
      const app = getApp();
      app.globalData.loginData = result.result;
      
      // 从返回数据中提取用户信息
      const userData = {
        openid: result.result.openid,
        appid: result.result.appid,
        unionid: result.result.unionid,
        userInfo: result.result.event.userInfo
      };
      
      app.globalData.userData = userData;
      
      // 保存到本地存储
      wx.setStorageSync('loginData', result.result);
      wx.setStorageSync('userData', userData);
      
      wx.showToast({
        title: '登录成功'
      });
      
      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);
    } catch (err) {
      console.error('登录失败', err);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 查看用户协议
  viewAgreement() {
    wx.navigateTo({
      url: '/pages/auth/agreement/agreement'
    });
  },

  // 查看隐私政策
  viewPrivacy() {
    wx.navigateTo({
      url: '/pages/auth/privacy/privacy'
    });
  }
})