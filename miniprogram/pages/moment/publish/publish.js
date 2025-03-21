Page({
  data: {
    content: '',
    images: [],
    location: '',
    isPublic: true,
    isLoading: false,
    maxImageCount: 9
  },

  // 输入内容
  inputContent(e) {
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
    
    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          images: [...images, ...res.tempFilePaths]
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
          success: (res) => {
            if (res.data.status === 0) {
              this.setData({
                location: res.data.result.address
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

  // 切换公开状态
  togglePublic() {
    this.setData({
      isPublic: !this.data.isPublic
    });
  },

  // 发布动态
  async publishMoment() {
    const { content, images, location, isPublic } = this.data;
    
    if (!content.trim() && images.length === 0) {
      wx.showToast({
        title: '请输入内容或上传图片',
        icon: 'none'
      });
      return;
    }
    
    try {
      this.setData({ isLoading: true });
      
      // 上传图片到云存储
      const fileIDs = [];
      if (images.length > 0) {
        wx.showLoading({
          title: '上传图片中...',
        });
        
        for (let i = 0; i < images.length; i++) {
          const filePath = images[i];
          const cloudPath = `moments/${Date.now()}-${i}.jpg`;
          
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath,
            filePath
          });
          
          fileIDs.push(uploadResult.fileID);
        }
        
        wx.hideLoading();
      }
      
      // 调用云函数发布动态
      const result = await wx.cloud.callFunction({
        name: 'moments_publish',
        data: {
          content,
          images: fileIDs,
          location,
          isPublic
        }
      });
      
      if (result.result.success) {
        wx.showToast({
          title: '发布成功'
        });
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result.message || '发布失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('发布失败', err);
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  }
}) 