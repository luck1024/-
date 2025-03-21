// pages/auth/auth.js
var uool = require("../../utils/uool")
Page({

  /**
   * 页面的初始数据
   */
  data: {
    phone: '', //电话
    contantTxt: '获取验证码', //按钮中展示的内容
    countTime: 60, //倒计时的时间
    code: '点击获取验证码', //验证
    code1: ''
  },
  bindPhoneInput(e) {
    console.log(e.detail.value);
    this.setData({
      phone: e.detail.value
    })

  },
  bindCodeInput(e) {
    // console.log(e);
    this.setData({
      code1: e.detail.value
    })
  },
  // 验证码
  onClickCheckCode: uool.debounce(function (evt) {
    var code;
    //首先默认code为空字符串
    code = '';
    //设置长度，这里看需求
    var codeLength = 4;
    //设置随机字符
    var random = new Array(0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z');
    //循环codeLength 我设置的4就是循环4次
    for (var i = 0; i < codeLength; i++) {
      //设置随机数范围,这设置为0 ~ 62（10+26+26）
      var index = Math.floor(Math.random() * 62);
      //字符串拼接 将每次随机的字符 进行拼接
      code += random[index];
    }
    this.setData({
      code: code
    })
    // this.code=code;
  }, 1000),
  onClickSubmit() {
    if (this.data.phone !== '' && this.data.code1 == this.data.code) {
      this.getUserProfile()
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/logs/logs'
        })
      }, 1500)



    } else {
      wx.showToast({
        title: '请输入正确验证或昵称',
        icon: 'none'
      })
    }
  },
  getUserProfile() {
    // 推荐使用 wx.getUserProfile 获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认
    // 开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '用于获取用户头像和昵称', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res);
        console.log(11);
        wx.setStorageSync('user', res.userInfo)
      }
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

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
    console.log(this);
    clearInterval(this.countDown);
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