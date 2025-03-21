const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    content: '',
    images: [],
    location: '',
    mood: '',
    weather: '',
    isPrivate: false,
    isSubmitting: false,
    maxImageCount: 9,
    moods: ['开心', '难过', '兴奋', '平静', '生气', '疲惫', '无聊'],
    weathers: ['晴天', '多云', '阴天', '小雨', '大雨', '雪', '雾'],
    showLocationPicker: false
  },

  onLoad(options) {
    // 获取用户信息
    const userInfo = wx.getStorageSync('userData');
    if (userInfo) {
      this.setData({
        userInfo
      });
    }
  },

  // 输入内容
  onContentInput(e) {
    this.setData({
      content: e.detail.value
    });
  },

  // 选择图片
  chooseImage() {
    const { images, maxImageCount } = this.data;
    const remainCount = maxImageCount - images.length;
    
    if (remainCount <= 0) {
      wx.showToast({
        title: `最多选择${maxImageCount}张图片`,
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(file => file.tempFilePath);
        this.setData({
          images: [...images, ...newImages]
        });
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const { index } = e.currentTarget.dataset;
    const { images } = this.data;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const { images } = this.data;
    
    images.splice(index, 1);
    this.setData({ images });
  },

  // 选择心情
  selectMood(e) {
    this.setData({
      mood: e.currentTarget.dataset.mood
    });
  },

  // 选择天气
  selectWeather(e) {
    this.setData({
      weather: e.currentTarget.dataset.weather
    });
  },

  // 获取位置
  getLocation() {
    wx.showLoading({
      title: '获取位置中...',
    });
    
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res;
        
        // 逆地理编码获取位置名称
        wx.request({
          url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=YOUR_MAP_KEY`,
          success: (result) => {
            if (result.data.status === 0) {
              const address = result.data.result.address_component;
              const locationName = `${address.city}${address.district}`;
              
              this.setData({
                location: locationName
              });
            }
          },
          complete: () => {
            wx.hideLoading();
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '获取位置失败',
          icon: 'none'
        });
      }
    });
  },

  // 切换私密状态
  togglePrivate() {
    this.setData({
      isPrivate: !this.data.isPrivate
    });
  },

  // 发布动态
  async publishMoment() {
    try {
      // 表单验证
      if (!this.data.content.trim() && this.data.images.length === 0) {
        wx.showToast({
          title: '请输入内容或上传图片',
          icon: 'none'
        });
        return;
      }

      this.setData({ isSubmitting: true });

      const openid = app.globalData.openid;
      if (!openid) {
        console.error('未获取到 openid');
        return;
      }

      // 获取用户信息
      const userInfo = wx.getStorageSync('userData');
      if (!userInfo) {
        console.error('未找到用户信息');
        return;
      }

      // 上传图片
      const fileIDs = [];
      if (this.data.images.length > 0) {
        wx.showLoading({
          title: '上传图片中...',
          mask: true
        });

        for (let i = 0; i < this.data.images.length; i++) {
          const filePath = this.data.images[i];
          const cloudPath = `diary_images/${openid}_${Date.now()}_${i}.${filePath.match(/\.(\w+)$/)[1]}`;
          
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath,
            filePath
          });
          
          fileIDs.push(uploadResult.fileID);
        }

        wx.hideLoading();
      }

      // 构建动态数据
      const diaryData = {
        content: this.data.content.trim(),
        images: fileIDs,
        location: this.data.location,
        mood: this.data.mood,
        weather: this.data.weather,
        isPrivate: this.data.isPrivate,
        nickName: userInfo.nickName || '用户',
        avatarUrl: userInfo.avatarUrl || '/images/default-avatar.png',
        partnerId: userInfo.partnerId || null,
        createTime: db.serverDate(),
        likes: 0,
        comments: []
      };

      // 保存到 diaries 集合
      await db.collection('diaries').add({
        data: diaryData
      });

      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 2000,
        success: () => {
          setTimeout(() => {
            wx.navigateBack();
          }, 2000);
        }
      });

    } catch (err) {
      console.error('发布动态失败:', err);
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  // 添加选择位置方法
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        const { name, address } = res;
        let locationName = name;
        
        // 如果地点名称为空，则使用地址
        if (!locationName || locationName.trim() === '') {
          // 从地址中提取城市和区域信息
          const addressParts = address.split(/[省市区县]/);
          locationName = addressParts.length > 1 ? addressParts[1] : address;
        }
        
        this.setData({
          location: locationName
        });
      },
      fail: () => {
        // 用户取消选择或发生错误
        console.log('用户取消选择位置或发生错误');
      }
    });
  }
}); 