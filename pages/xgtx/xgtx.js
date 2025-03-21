// pages/Extra/xgtx/xgtx.js
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    title: '修改',
    backIcon: 'https://s1.ax1x.com/2022/04/01/qhYKsK.png',
    head: '',
    a: '', //原头像
    b: '', //原昵称
    c: '', //原电话号码
    // img: [],
    nickname: '',
    plone: ''
  },
  // 昵称
  themes:function (e) {
    this.setData({
      nickname: e.detail.value
    })
    console.log(this.data.nickName);
  },
 
  // 头像
  headimage: function () {
    var that = this;
    wx.chooseMedia({
      camera: 'back', //前置摄像头还是后置
      count: 1, // 默认9     
      sizeType: ['original', 'compressed'],
      // 指定是原图还是压缩图，默认两个都有     
      mediaType: ['image'],
      sourceType: [], //来源相册，拍照
      success: function (res) {
        console.log(res);
                that.setData({
                   head: res.tempFiles[0].tempFilePath
                })

     

      }

    })

  },
  amend(){
var a={
  nickName:this.data.nickname,
  avatarUrl:  this.data.head
}
wx.setStorageSync('user', a)
wx.switchTab({
  url: '../home/home'

})
  },
  cancel: function () {
    wx.switchTab({
      url: '../home/home'

    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取要替换得头像
    var userInfo = wx.getStorageSync('user')
    console.log(userInfo);
    this.setData({
      //原头像
      head:userInfo.avatarUrl,
      //点击修改事件判断是否与原头像相等==>75行
      a: userInfo.avatarUrl,
      nickname: userInfo.nickName,
      //点击修改事件判断是否与原昵称相等==>75行
      b:userInfo.nickName,
      
    })
    console.log(this.data.nickname);
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