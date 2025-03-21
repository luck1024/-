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