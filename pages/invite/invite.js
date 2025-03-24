const db = wx.cloud.database();
const _ = db.command;
const app = getApp();
Page({
  data: {
    inviteCode: '',
    hasInviteCode: false
  },

  onLoad() {
    // 页面加载时自动生成邀请码
    this.generateInviteCode();
  },

  // 生成邀请码
  async generateInviteCode() {
    try {
      wx.showLoading({ title: '生成中...' });
      
      // 检查用户是否已经绑定伴侣
      const userResult = await db.collection('users').where({
        _openid: this.data.openid
      }).get(userResult);
      console.log(userResult);
      if (userResult.data.length === 0) {
        wx.showToast({
          title: '您还没有绑定伴侣',
          icon: 'none'
        });
        return;
      }
    let arr=  userResult.data.map(item=>item._openid==app.globalData.openid)
      if (arr.length > 0 && arr[0].partnerId) {
        wx.showToast({
          title: '您已经绑定了伴侣',
          icon: 'none'
        });
        return;
      }

      // 生成6位随机邀请码
      const code = Math.random().toString(36).substr(2, 6).toUpperCase();
      
      // 保存邀请码
      await db.collection('invites').add({
        data: {
          code,
          status: 'unused',
          createTime: db.serverDate()
        }
      });
      console.log(code);
      
      this.setData({
        inviteCode: code,
        hasInviteCode: true
      });
      
      wx.hideLoading();
      
    } catch (err) {
      wx.hideLoading();
      console.error('生成邀请码失败:', err);
      wx.showToast({
        title: '生成失败',
        icon: 'none'
      });
    }
  },



  // 输入邀请码
  onInputInviteCode(e) {
    this.setData({
      inviteCode: e.detail.value
    });
  },

  // 复制邀请码
  copyInviteCode() {
    if (!this.data.inviteCode) return;
    
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  // 分享小程序
  onShareAppMessage() {
    return {
      title: '邀请你成为我的另一半❤️',
      path: `/pages/auth/login/login?code=${this.data.inviteCode}`, // 修改为登录页面
      imageUrl: '/images/share.png'
    };
  },
  
  // 跳转到接受邀请页面
  goToAcceptInvite() {
    // 检查是否已登录
    const userData = wx.getStorageSync('userData');
    if (!userData) {
      wx.navigateTo({
        url: `/pages/auth/login/login?code=${this.data.inviteCode}`
      });
    } else {
      wx.navigateTo({
        url: `/pages/invite/accept/accept?code=${this.data.inviteCode}`
      });
    }
  }
});
