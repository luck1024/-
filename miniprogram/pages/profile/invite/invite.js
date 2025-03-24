const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    inviteCode: '',
    isLoading: false
  },

  onLoad() {
    this.generateInviteCode();
  },

  // 生成邀请码
  async generateInviteCode() {
    try {
      this.setData({ isLoading: true });
      
      // 先检查用户是否已经有邀请码
      const openid = app.globalData.openid;
      
      // 检查用户是否已有伴侣
      const userResult = await db.collection('users').where({
        _openid: openid
      }).get();
      
      if (userResult.data.length > 0 && userResult.data[0].partnerId) {
        wx.showToast({
          title: '您已有伴侣，无需生成邀请码',
          icon: 'none'
        });
        this.setData({ isLoading: false });
        return;
      }
      
      // 调用云函数生成新邀请码（会覆盖旧邀请码）
      const result = await wx.cloud.callFunction({
        name: 'user_generateInviteCode'
      });
      
      if (result.result.success) {
        this.setData({
          inviteCode: result.result.inviteCode
        });
      } else {
        wx.showToast({
          title: '生成邀请码失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('生成邀请码失败', err);
      wx.showToast({
        title: '生成邀请码失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 复制邀请码
  copyInviteCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        wx.showToast({
          title: '已复制邀请码'
        });
      }
    });
  },

  // 分享小程序
  onShareAppMessage() {
    return {
      title: '邀请你成为我的另一半❤️',
      path: `/pages/invitation/accept?code=${this.data.inviteCode}`,
      imageUrl: '/images/share-invite.png' // 需要准备分享图片
    };
  },

  // 跳转到输入邀请码页面
  goToAcceptInvite() {
    wx.navigateTo({
      url: '/pages/invitation/accept'
    });
  }
}) 