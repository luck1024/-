// pages/Publish/publish.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    username:'',//昵称
    message:'',//文案
    fileList:[],//图片预览地址
    mainimage:'',//展示图
    headhead :'',//头像

  },
// 图片上传
afterRead(event) {
  const { file } = event.detail;
  this.setData({ fileList:[file] ,      mainimage:file.url});
  // 当设置 mutiple 为 true 时, file 为数组格式，否则为对象格式
  wx.uploadFile({
    url: 'https://example.weixin.qq.com/upload', // 仅为示例，非真实的接口地址
    filePath: file.url,
    name: 'file',
    formData: { user: 'test' },
    success(res) {
      console.log(res);
      // 上传完成需要更新 fileList
      const { fileList = [] } = this.data;
      fileList.push({ ...file, url: res.data });
      this.setData({ fileList });
    },
  });
},
// 提交
submit(){

  const {fileList, ...newdata} = this.data
  console.log(newdata);
  wx.showModal({
    title: '提示',
    content: '投稿失败',
    showCancel: false,
    confirmText:'收到',
    success(res) {
    }
  })
},
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    var userInfo = wx.getStorageSync('user')
    console.log(userInfo.avatarUrl);
    this.setData({
      headhead:userInfo.avatarUrl,
    })
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

  }
})