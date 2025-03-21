Page({
  data: {
    loveMessages: [
      "想你的时候，世界都是粉色的~",
      "今天也是爱你的一天！",
      "你是我最重要的小可爱",
      "我的世界因你而精彩",
      "每一天都想和你在一起"
    ],
    anniversaryDate: '2024-01-01', // 替换成你们的纪念日
    daysCount: 0,
    photos: [
      // 添加你们的照片URL
    ],
    wishes: [
      {title: "一起去看樱花", completed: false},
      {title: "一起去海边", completed: false},
      {title: "一起看日出", completed: false}
    ]
  },

  onLoad() {
    this.calculateDays();
    this.showRandomLoveMessage();
  },

  calculateDays() {
    const start = new Date(this.data.anniversaryDate);
    const today = new Date();
    const days = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    this.setData({
      daysCount: days
    });
  },

  showRandomLoveMessage() {
    const idx = Math.floor(Math.random() * this.data.loveMessages.length);
    wx.showToast({
      title: this.data.loveMessages[idx],
      icon: 'none',
      duration: 2000
    });
  }
})