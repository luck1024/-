Page({
  data: {
    recipient: null,
    title: '',
    content: '',
    images: [],
    isLoading: false,
    maxImageCount: 3
  },

  onLoad(options) {
    // 获取伴侣信息
    this.loadPartnerInfo();
  },

  // 加载伴侣信息
  async loadPartnerInfo() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user_getPartnerInfo'
      });
      
      if (result.result.success) {
        this.setData({
          recipient: result.result.partner
        });
      } else {
        wx.showToast({
          title: '获取伴侣信息失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('获取伴侣信息失败', err);
      wx.showToast({
        title: '获取伴侣信息失败',
        icon: 'none'
      });
    }
  },

  // 输入标题
  inputTitle(e) {
    this.setData({
      title: e.detail.value
    });
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

  // 发送信件
  async sendLetter() {
    const { recipient, title, content, images } = this.data;
    
    if (!recipient) {
      wx.showToast({
        title: '请先绑定伴侣',
        icon: 'none'
      });
      return;
    }
    
    if (!title.trim()) {
      wx.showToast({
        title: '请输入标题',
        icon: 'none'
      });
      return;
    }
    
    if (!content.trim()) {
      wx.showToast({
        title: '请输入内容',
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
          const cloudPath = `letters/${Date.now()}-${i}.jpg`;
          
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath,
            filePath
          });
          
          fileIDs.push(uploadResult.fileID);
        }
        
        wx.hideLoading();
      }
      
      // 调用云函数发送信件
      const result = await wx.cloud.callFunction({
        name: 'letters_send',
        data: {
          recipientId: recipient._id,
          title,
          content,
          images: fileIDs
        }
      });
      
      if (result.result.success) {
        wx.showToast({
          title: '发送成功'
        });
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result.message || '发送失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('发送失败', err);
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  }
}) 