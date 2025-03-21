Page({
  data: {
    settings: {
      notifications: true,
      sound: true,
      vibration: true,
      dailyReminder: false,
      reminderTime: '20:00',
      theme: 'light'
    },
    isLoading: false
  },

  onLoad() {
    this.loadSettings();
  },

  // 加载设置
  async loadSettings() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user_getSettings'
      });
      
      if (result.result.success) {
        this.setData({
          settings: { ...this.data.settings, ...result.result.settings }
        });
      }
    } catch (err) {
      console.error('获取设置失败', err);
    }
  },

  // 切换开关设置
  toggleSetting(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({
      [`settings.${key}`]: !this.data.settings[key]
    });
    this.saveSettings();
  },

  // 选择提醒时间
  selectReminderTime(e) {
    this.setData({
      'settings.reminderTime': e.detail.value
    });
    this.saveSettings();
  },

  // 选择主题
  selectTheme(e) {
    this.setData({
      'settings.theme': e.currentTarget.dataset.theme
    });
    this.saveSettings();
  },

  // 保存设置
  async saveSettings() {
    try {
      this.setData({ isLoading: true });
      
      const result = await wx.cloud.callFunction({
        name: 'user_updateSettings',
        data: {
          settings: this.data.settings
        }
      });
      
      if (!result.result.success) {
        wx.showToast({
          title: '保存设置失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('保存设置失败', err);
      wx.showToast({
        title: '保存设置失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除缓存吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage({
            success: () => {
              wx.showToast({
                title: '清除成功'
              });
            },
            fail: () => {
              wx.showToast({
                title: '清除失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.redirectTo({
            url: '/pages/auth/login/login'
          });
        }
      }
    });
  }
}) 