Page({
  data: {
    userInfo: null,
    nickName: '',
    avatarUrl: '',
    gender: 1, // 1: 男, 2: 女
    birthday: '',
    isLoading: false
  },

  onLoad() {
    this.loadUserInfo();
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user_getInfo'
      });
      
      if (result.result.success) {
        const userInfo = result.result.userInfo;
        this.setData({
          userInfo,
          nickName: userInfo.nickName || '',
          avatarUrl: userInfo.avatarUrl || '',
          gender: userInfo.gender || 1,
          birthday: userInfo.birthday || ''
        });
      }
    } catch (err) {
      console.error('获取用户信息失败', err);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    }
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        
        try {
          // 上传头像到云存储
          const cloudPath = `avatars/${Date.now()}.jpg`;
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath
          });
          
          this.setData({
            avatarUrl: uploadResult.fileID
          });
        } catch (err) {
          console.error('上传头像失败', err);
          wx.showToast({
            title: '上传头像失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 输入昵称
  inputNickName(e) {
    this.setData({
      nickName: e.detail.value
    });
  },

  // 选择性别
  selectGender(e) {
    this.setData({
      gender: parseInt(e.currentTarget.dataset.value)
    });
  },

  // 选择生日
  selectBirthday(e) {
    this.setData({
      birthday: e.detail.value
    });
  },

  // 保存资料
  async saveProfile() {
    const { nickName, avatarUrl, gender, birthday } = this.data;
    
    if (!nickName.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }
    
    try {
      this.setData({ isLoading: true });
      
      const result = await wx.cloud.callFunction({
        name: 'user_updateInfo',
        data: {
          nickName,
          avatarUrl,
          gender,
          birthday
        }
      });
      
      if (result.result.success) {
        wx.showToast({
          title: '保存成功'
        });
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result.message || '保存失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('保存失败', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  }
}) 