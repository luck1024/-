const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    userInfo: null,
    partnerInfo: null,
    hasPartner: false,
    isLoading: true,
    stats: {
      photos: 0,
      moments: 0,
      days: 0
    },
    menuList: [
      {
        icon: 'https://img.icons8.com/fluency/96/filled-like.png',
        text: '我的收藏',
        path: '/pages/collection/collection'
      },
      {
        icon: 'https://img.icons8.com/fluency/96/appointment-reminders.png',
        text: '提醒事项',
        path: '/pages/reminders/reminders'
      },
      {
        icon: 'https://img.icons8.com/fluency/96/filled-star.png',
        text: '纪念日',
        path: '/pages/anniversary/anniversary'
      },
      {
        icon: 'https://img.icons8.com/fluency/96/settings.png',
        text: '设置',
        path: '/pages/settings/settings'
      }
    ]
  },

  onLoad() {
    this.loadUserData();
  },

  onShow() {
    this.loadUserData();
  },

  async loadUserData() {
    try {
      this.setData({ isLoading: true });

      const openid = app.globalData.openid;
      if (!openid) {
        console.error('未获取到 openid');
        return;
      }

      // 获取用户信息
      const userResult = await db.collection('users').where({
        _openid: openid
      }).get();
      console.log(userResult);

      if (userResult.data.length === 0) {
        console.error('未找到用户信息');
        return;
      }

      const userData = userResult.data[0];
      let partnerData = null;

      // 如果有伴侣，获取伴侣信息
      if (userData.partnerId) {
        const partnerResult = await db.collection('users').where({
          _openid: userData.partnerId
        }).get();
        
        if (partnerResult.data.length > 0) {
          partnerData = partnerResult.data[0];
        }
      }

      // 计算在一起的天数
      let daysCount = 0;
      if (userData.anniversary) {
        const start = new Date(userData.anniversary);
        const today = new Date();
        daysCount = Math.floor((today - start) / (1000 * 60 * 60 * 24));
      }

      // 获取相册数量，使用albums表而不是photos和moments
      let albumsCount = 0;
      try {
        if (userData.partnerId) {
          // 如果有伴侣，获取两个人的数据
          const albums = await db.collection('albums').where({
            _openid: _.in([openid, userData.partnerId])
          }).count();
          albumsCount = albums.total;
        } else {
          // 没有伴侣，只获取自己的数据
          const albums = await db.collection('albums').where({
            _openid: openid
          }).count();
          albumsCount = albums.total;
        }
      } catch (err) {
        console.error('获取相册数量失败:', err);
        // 如果出错，保持默认值0
      }

      // 格式化用户信息
      const formattedUserData = {
        ...userData,
        location: userData.location || `${userData.province} ${userData.city}`.trim() || '未设置地区',
        createTime: new Date(userData.createTime).toLocaleDateString(),
        lastLoginTime: new Date(userData.lastLoginTime).toLocaleDateString(),
        anniversary: userData.anniversary ? new Date(userData.anniversary).toLocaleDateString() : null
      };

      // 更新页面数据，使用albums数量代替photos和moments
      this.setData({
        userInfo: formattedUserData,
        partnerInfo: partnerData && {
          ...partnerData,
          location: partnerData.location || `${partnerData.province} ${partnerData.city}`.trim() || '未设置地区'
        },
        hasPartner: !!partnerData,
        stats: {
          albums: albumsCount, // 使用albums替代photos
          days: daysCount
          // 删除moments字段或设置为0
        },
        isLoading: false
      });

      // 更新本地存储
      wx.setStorageSync('userData', formattedUserData);

    } catch (err) {
      console.error('加载用户数据失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 编辑资料
  editProfile() {
    wx.navigateTo({
      url: '/pages/profile/edit/edit'
    });
  },

  // 菜单项点击
  handleMenuClick(e) {
    const { path } = e.currentTarget.dataset;
    wx.navigateTo({ url: path });
  },

  // 退出登录
  async logout() {
    try {
      const res = await wx.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        confirmColor: '#ff4444'
      });

      if (res.confirm) {
        // 清除本地存储
        wx.clearStorageSync();
        // 清除全局数据
        app.globalData.userInfo = null;
        app.globalData.openid = null;

        // 跳转到登录页
        wx.reLaunch({
          url: '/pages/auth/login/login'
        });
      }
    } catch (err) {
      console.error('退出失败:', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 处理图片加载错误
  handleImageError(e) {
    const { type } = e.currentTarget.dataset;
    const defaultAvatar = 'https://img.icons8.com/fluency/96/user-male-circle.png';

    if (type === 'user') {
      this.setData({
        'userInfo.avatarUrl': defaultAvatar
      });
    } else if (type === 'partner') {
      this.setData({
        'partnerInfo.avatarUrl': defaultAvatar
      });
    }
  }
}); 