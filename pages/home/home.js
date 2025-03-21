const {
  socket
} = require("../../utils/socket");
Page({
  data: {
    userInfo: {},
    fee: 1, // 支付金额，单位为分
    paymentArgs: 'A', // 将传递到功能页函数的自定义参数
    currencyType: 'CNY', // 货币符号，页面显示货币简写 US$ 
    version: 'develop', // 上线时，version 应改为 "release"，并确保插件所有者小程序已经发布

  },
  // 切换头像
  personal() {
    console.log(1);
    wx.navigateTo({
      url: '../xgtx/xgtx',
      success: function (res) {
        console.log(res);

      },

    })
  },
  // 其他
  handlePay() {
    wx.showModal({
      title: '提示',
      content: '请点人工客服进行反馈',
      showCancel: false,
      confirmText:'收到',
      success(res) {
      }
    })
    const {
      fee,
      paymentArgs,
      currencyType,
      version
    } = this.data

    // wx.requestPluginPayment({
    //   fee,
    //   paymentArgs,
    //   currencyType,
    //   version,
    //   success(r) {
    //     console.log('成功',r)
    //   },
    //   fail(e) {
    //     console.error('失败',e)
    //   }
    // })

  },
  //授权登录
  login() {
    wx.getUserProfile({
      desc: '用于资料', //声明获取用户个人信息后的用途，后续会展示在弹窗中
      success: res => {
        let user = res.userInfo
        //把用户信息缓存到本地
        wx.setStorageSync('user', user)
        console.log("用户信息", user)
        this.setData({
          userInfo: user
        })
      },
      fail: res => {
        console.log('授权失败', res)
      }
    })
  },
  onLoad(options) {
    console.log(options);
    //   var userInfo = wx.getStorageSync('userInfo')
    //   console.log(userInfo);
    // if(userInfo==''){
    //   this.setData({
    //     userInfo:userInfo
    //   })
    // }

    // 监听socket 是否连接成功
    console.log(socket);
    socket.onOpen(() => {
      socket.send({
        data: '大家好，我是练习时长俩年半的个人练习生。'
      })
    })
  },
  // 投稿箱
  contribute() {
    wx.navigateTo({
      url: '../Publish/publish' ,
    })
  },
  // 已点赞
  thumbs(){
    wx.navigateTo({
      url: '../thumbs/thumbs' ,
    })
  },
  // 已投稿
  submitted(){
    wx.navigateTo({
      url: '../submitted/submitted' ,
    })
  },
  // 被点赞
  like(){
    wx.navigateTo({
      url: '../like/like' ,
    })
  },
  onShow() {
    var _this = this
    var userInfo = wx.getStorageSync('user')
    // console.log(userInfo);
    // console.log(_this.data.userInfo);
    if (_this.data.userInfo == '' || userInfo !== _this.data.userInfo) {
      _this.setData({
        userInfo: userInfo
      })
      // console.log(_this.data.userInfo);
    }

  },
})