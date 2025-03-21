// pages/profile/edit/edit.js
const app = getApp();
const db = wx.cloud.database();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    isLoading: false,
    genderOptions: ['男', '女'],
    formData: {
      nickName: '',
      gender: '',
      birthday: '',
      location: ''
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadUserInfo();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadUserInfo();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      console.log(app.globalData.userData);
      const userResult = await db.collection('users').where({
        _openid: app.globalData.openid
      }).get();
      console.log(userResult);
      if (userResult.data.length > 0) {
        const userData = userResult.data[0];
        this.setData({
          userInfo: userData,
          formData: {
            nickName: userData.nickName || '',
            gender: userData.gender || '',
            birthday: userData.birthday || '',
            location: userData.location || ''
          }
        });
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 选择头像
  async chooseAvatar(e) {
    try {
      this.setData({ isLoading: true });
      const tempFilePath = e.detail.avatarUrl;
      
      // 上传图片到云存储
      const cloudPath = `avatars/${app.globalData.openid}_${Date.now()}.jpg`;
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath
      });

      // 更新用户头像
      await db.collection('users').where({
        _openid: app.globalData.openid
      }).update({
        data: {
          avatarUrl: uploadResult.fileID,
          updateTime: db.serverDate()
        }
      });

      this.setData({
        'userInfo.avatarUrl': uploadResult.fileID
      });

      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      });

    } catch (err) {
      console.error('更新头像失败:', err);
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 输入昵称
  onInputNickName(e) {
    this.setData({
      'formData.nickName': e.detail.value
    });
  },

  // 选择性别
  onSelectGender(e) {
    this.setData({
      'formData.gender': this.data.genderOptions[e.detail.value]
    });
  },

  // 选择生日
  onSelectBirthday(e) {
    this.setData({
      'formData.birthday': e.detail.value
    });
  },

  // 选择地区
  onSelectLocation(e) {
    this.setData({
      'formData.location': e.detail.value.join(' ')
    });
  },

  // 保存资料
  async saveProfile() {
    try {
      if (!this.data.formData.nickName.trim()) {
        wx.showToast({
          title: '请输入昵称',
          icon: 'none'
        });
        return;
      }

      this.setData({ isLoading: true });

      await db.collection('users').where({
        _openid: app.globalData.openid
      }).update({
        data: {
          ...this.data.formData,
          updateTime: db.serverDate()
        }
      });

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (err) {
      console.error('保存失败:', err);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  }
})