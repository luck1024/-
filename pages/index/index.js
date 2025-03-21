// index.js
// 获取应用实例
const app = getApp()
//引入高德SDK
var amapFile = require('../../utils/amap-wx.130');
var key = "98288b73d4c302e1e228f784afc9adb3";
var markersData = [];
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    partnerInfo: null,
    hasPartner: false,
    isLoading: true,
    anniversary: null,
    daysCount: 0,
    todayMood: null,
    backgroundImage: '',
    moments: [],
    upcomingTasks: [],
    markers: [],
    latitude: '',
    longitude: '',
    textData: {},
    city: '',
    keywords: '',
    mapshow: true,
    maptextshow: false,
    tipshow: false,
    tips: {},
    isIos: false,
    currentLocation: {}, //当前坐标
    destination: {}, //目的地坐标
    range: '',
    bgImage: '/images/mhhy/1681e8119e167779d04c40e5cb65fba.jpg',
    boyAvatar: '/images/mhhy/d99f57375b6f65d15d99d89a5de4e6c.jpg',
    girlAvatar: '/images/mhhy/ea8699af488c70edf5dab52e082b072.jpg',
    heartIcon: 'https://img.icons8.com/color/96/000000/heart-balloon.png',
    daysCount: 365,
    anniversaryDate: '2024.12.07',
    weatherIcon: 'https://img.icons8.com/color/96/000000/sun--v1.png',
    weather: {
      temp: 23,
      desc: '晴天'
    },
    currentMood: -1,
    moods: [
      { icon: 'https://img.icons8.com/color/96/000000/happy.png', text: '开心' },
      { icon: 'https://img.icons8.com/color/96/000000/in-love.png', text: '想你' },
      { icon: 'https://img.icons8.com/color/96/000000/sad.png', text: '想见你' },
      { icon: 'https://img.icons8.com/color/96/000000/crying.png', text: '难过' },
      { icon: 'https://img.icons8.com/color/96/000000/angry.png', text: '生气' }
    ],
    features: [
      { id: 1, type: 'album', icon: '/images/22.png', title: '相册' },
      { id: 2, type: 'letter', icon: 'https://img.icons8.com/color/96/000000/love-letter.png', title: '情书' },
      { id: 3, type: 'diary', icon: 'https://img.icons8.com/color/96/000000/diary.png', title: '日记' },
      { id: 4, type: 'wish', icon: 'https://img.icons8.com/color/96/000000/wish-list.png', title: '愿望' }
    ],
    recentPhotos: [
      {
        id: 1,
        url: '/images/mhhy/1681e8119e167779d04c40e5cb65fba.jpg',
        date: '2024.03.20',
        // location: '东京'
      },
      {
        id: 2,
        url: '/images/mhhy/d2fa3e23aa25a9652e36f2fa3fb841e.jpg',
        date: '2024.03.15',
        // location: '大阪'
      },
      {
        id: 3,
        url: '/images/mhhy/ea8699af488c70edf5dab52e082b072.jpg',
        date: '2024.03.10',
        // location: '京都'
      }
    ],
    countdowns: [
      {
        id: 1,
        title: '生日快乐',
        date: '2024.02.28',
        isAnnual: true
      },
      {
        id: 2,
        title: '纪念日',
        date: '2024.12.07',  // 初始纪念日期
        isAnnual: true  // 标记为年度重复
      },

    ],
    loveMessages: [
      "想你的感觉，温暖了整个世界 💕",
      "你是我最美好的相遇 ✨",
      "每一天都因为有你而特别 🌟",
      "我们的故事还在继续书写 📖",
      "你是我最甜蜜的牵挂 🍯",
      "你的微笑，是我最温暖的阳光 ☀️",
      "遇见你，是我最美的幸运 🍀",
      "你的名字，是我心底最柔软的诗篇 💌",
      "牵着你的手，走过每一个春夏秋冬 🍂🌸",
      "你是我心中最耀眼的星辰 ✨",
      "爱你，是我最坚定的选择 💖",
      "世界再大，我的心里只有你 💕",
      "有你在，平凡的日子也会闪闪发光 🌟",
      "你的陪伴，是我一生最温暖的依靠 🏡",
      "我们的故事，才刚刚开始 📖",
      "你的笑容，是我最甜蜜的期待 🍯",
      "想你，是一天中最美好的时刻 🌙",
      "你是我生命里最动人的风景 🎠",
      "每一天，都因你而充满幸福 💞",
      "你的声音，是我最爱的旋律 🎶",
      "你是我梦里最温暖的归宿 🏡",
      "你的眼神，是最迷人的星光 🌠",
      "你的爱，是我心里最柔软的角落 💓",
      "和你在一起，世界都变得温柔 🥰",
      "我的心里，从此住进了你 ❤️",
      "你的温柔，是我最深的依赖 🤗",
      "这一生，最幸运的事就是遇见你 🍀",
      "你是我梦里，最美的风景 🎠",
      "你的名字，我想用一生去呼唤 📝",
      "牵着你的手，我才有家的感觉 🏡",
      "你的眼睛，藏着最美的星光 🌠",
      "世界再大，我的心只住得下你 💖",
      "你是我心中的独家限定 💫",
      "我的世界，因为你而变得美好 🌍",
      "只要有你，平凡的日子也会闪闪发光 ✨",
      "你是我此生唯一的心动 💖",
      "你是我心上永远的珍宝 💎",
      "无论未来多远，我的心都只属于你 ❤️",
      "你是我生命里最动听的旋律 🎵",
      "我的世界因为你而完整 🧩",
      "你是我心底最温暖的光芒 🌞",
      "无论风雨，我都会陪在你身边 ☔",
      "你是我最温柔的牵挂 💕",
      "有你在，日子就有了意义 🌟",
      "你的笑容胜过世间所有的风景 🏝️",
      "和你在一起，世界都变得温柔 🥰",
      "你是我心中最美的风景线 🎠",
      "有你陪伴，人生就不会孤单 🌈",
      "你的爱是我心中最温暖的依靠 ❤️",
      "想你的每一刻，都是心跳的声音 💓",
      "你的存在，让每一天都充满阳光 ☀️",
      "你是我生命里最美的邂逅 ✨",
      "有你在，所有美好都会如约而至 🌸",
      "你是我最美的故事，每一页都珍贵 📖",
      "你的笑容，是我心中最甜的糖果 🍬",
      "世界再喧嚣，心里最想的人依然是你 💕",
      "你是我心中永远的风景，无需取代 🌅",
      "你的名字，是我心里最温柔的旋律 🎶",
      "爱你是我今生最美的决定 💍",
      "你的拥抱，是我最安心的避风港 ⚓",
      "你是我生命里最甜的梦境 💤",
      "你是我的光，照亮所有黑暗 🌞",
      "你的爱，是我心里最柔软的角落 💖",
      "你的眼神，藏着我一生的温柔 💕",
      "只要有你，所有等待都值得 ⏳",
      "你是我故事里最温暖的篇章 📖",
      "你是我心底最耀眼的存在 ✨",
      "和你在一起，每一天都是节日 🎉",
      "你是我最温柔的守候 🌷",
      "你的微笑，是世界上最美的色彩 🎨",
      "我愿陪你走过每一个晨昏 🌄",
      "你是我一生都想珍藏的宝藏 💎",
      "牵你的手，就不想再放开 ❤️",
      "你的存在，让平凡的日子变得美丽 💐",
      "我愿陪你看遍世界的风景 🌍",
      "你是我最动人的旋律 🎵",
      "你是我心里最甜的期待 🍯",
      "想你的时候，连风都是温柔的 🍃",
      "你是我生命里最动人的诗篇 📖",
      "你的爱，温暖了我的整个世界 ☀️",
      "只要有你，心就不会迷失 🧭",
      "和你在一起，未来充满无限可能 🌠",
      "你是我生活里最绚烂的色彩 🌈",
      "你的笑声，是我最爱的旋律 🎶",
      "你是我梦里最柔软的光 🌙",
      "爱你的心，从未改变 ❤️",
      "世界很大，但我只愿停在你身旁 🌍",
      "有你在的地方，就是最温暖的家 🏡",
      "你的拥抱，是我心灵的港湾 🌊",
      "你是我所有美梦的归宿 💤",
      "你是我心里最温暖的存在 💖",
      "无论未来如何，我的心始终向你靠近 💕",
      "你是我生命里最珍贵的礼物 🎁",
      "有你在，我的世界才完整 🧩",
      "牵着你的手，我愿走过所有岁月 ⏳",
      "你的爱，是我心中最柔软的角落 💓",
      "你的笑容，是我心里最甜蜜的风景 🎠",
      "有你的日子，连时间都变得温柔 ⏰",
      "世界再冷，也有你的温暖陪伴 ❄️",
      "爱你，是我生命中最浪漫的选择 💍",
      "你是我心中最闪耀的星辰 ✨",
      "只要有你，日子就充满诗意 📖",
      "你的存在，让世界都变得美好 🌟"






    ]
  },

  onLoad() {
    // this.loadUserData();
  },

  onShow() {
    // 检查登录状态
    // const app = getApp();
    // if (app.checkLoginStatus()) {
      this.loadUserData();
    // }
  },

  // 加载用户数据
  async loadUserData() {
    try {
      this.setData({ isLoading: true });
      
      const app = getApp();
      console.log('app.globalData.userData',app.globalData);
      
      if (!app.globalData.userInfo || !app.globalData.openid) {
        console.error('用户数据不存在');
        throw new Error('用户数据不存在');
      }
      console.log(app.globalData.userInfo);
      // 设置用户信息
      this.setData({
        userInfo: app.globalData.userInfo
      });
      
      // 从云数据库获取最新用户信息
      const db = wx.cloud.database();
      const userResult = await db.collection('users').where({
        _openid: app.globalData.openid
      }).get();
      console.log('userResult',userResult);
      if (userResult.data[0].partnerId) {
        const dbUserInfo = userResult.data[0];
        console.log('dbUserInfo',dbUserInfo);
        
        // 检查是否有绑定的情侣
        if (dbUserInfo.partnerId) {
          // 获取情侣信息
          const partnerResult = await db.collection('users').where({
            _openid: dbUserInfo.partnerId
          }).get();
          console.log('partnerResult',partnerResult);
          if (partnerResult.data.length > 0) {
            const partnerInfo = partnerResult.data[0];
            
            this.setData({
              partnerInfo: {
                ...partnerInfo,
                avatarUrl: partnerInfo.avatarUrl || app.globalData.images.defaultAvatar
              },
              hasPartner: true
            });
            
            // 计算恋爱天数
            if (dbUserInfo.anniversary) {
              const anniversary = new Date(dbUserInfo.anniversary);
              const today = new Date();
              const diffTime = Math.abs(today - anniversary);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              this.setData({
                anniversary: dbUserInfo.anniversary,
                daysCount: diffDays
              });
            }
          }
        } else {
          this.setData({
            hasPartner: false,
            partnerInfo: null
          });
        }
      }
      
      // 获取相册图片作为背景和美好瞬间
      const albumResult = await db.collection('albums')
        .where({
          _openid: db.command.in([app.globalData.openid, this.data.partnerInfo?._openid || ''])
        })
        .orderBy('createTime', 'desc')
        .limit(10)
        .get();
      
      if (albumResult.data.length > 0) {
        // 使用第一张图片作为背景
        this.setData({
          backgroundImage: albumResult.data[0].imageUrl
        });
        
        // 使用前3张图片作为美好瞬间
        const moments = albumResult.data.slice(0, 3).map(item => ({
          _id: item._id,
          imageUrl: item.imageUrl,
          description: item.description || '美好瞬间',
          createTime: item.createTime
        }));
        
        this.setData({
          moments: moments
        });
      }
      
      // 加载今日心情
      try {
        const today = this.formatDate(new Date());
        console.log('Today:', today);
        console.log('Current openid:', app.globalData.openid);
        
        const moodResult = await db.collection('moods')
          .where({
            openid: app.globalData.openid,
            date: today
          })
          .get();
        
        console.log('Mood result:', moodResult);
        
        this.setData({
          todayMood: moodResult.data[0] || null
        });
      } catch (moodErr) {
        console.error('加载心情失败:', moodErr);
        // 心情加载失败不影响其他数据的显示
        this.setData({
          todayMood: null
        });
      }
      
    } catch (err) {
      console.error('加载用户数据失败:', err);
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },
  
  // 格式化日期为 YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  
  // 跳转到邀请页面
  goToInvite() {
    if (!this.data.hasPartner) {
      wx.navigateTo({
        url: '/pages/invite/invite'
      });
    }
  },

  calculateDays() {
    const start = new Date(this.data.anniversaryDate.replace(/\./g, '/'));
    const today = new Date();
    const days = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    this.setData({ daysCount: days });
  },

  calculateCountdowns() {
    const today = new Date();
    const countdowns = this.data.countdowns.map(item => {
      let targetDate = new Date(item.date.replace(/\./g, '/'));

      if (item.isAnnual) {
        // 获取今年的纪念日期
        const thisYear = new Date(today.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate());

        // 如果今年的日期已过，就计算到明年的日期
        if (thisYear < today) {
          targetDate = new Date(today.getFullYear() + 1,
            targetDate.getMonth(),
            targetDate.getDate());
        } else {
          targetDate = thisYear;
        }
      }

      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // 计算已经过去多少年
      let yearsPassed = 0;
      if (item.isAnnual) {
        yearsPassed = today.getFullYear() - new Date(item.date.replace(/\./g, '/')).getFullYear();
        if (today.getMonth() < targetDate.getMonth() ||
          (today.getMonth() === targetDate.getMonth() && today.getDate() < targetDate.getDate())) {
          yearsPassed--;
        }
      }

      return {
        ...item,
        days: diffDays,
        yearsPassed: yearsPassed,
        nextDate: targetDate.toLocaleDateString('zh-CN', {
          month: 'numeric',
          day: 'numeric'
        })
      };
    });

    this.setData({ countdowns });
  },

  startCountdownTimer() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeToTomorrow = tomorrow - now;

    setTimeout(() => {
      this.calculateCountdowns();
      this.startCountdownTimer();
    }, timeToTomorrow);
  },

  selectMood(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentMood: index });
    wx.showToast({
      title: '心情已记录~',
      icon: 'success'
    });
  },

  handleFeature(e) {
    const type = e.currentTarget.dataset.type;
    const routes = {
      album: '/pages/album/album',
      letter: '/pages/letter/letter',
      diary: '/pages/moments/moments',
      wish: '/pages/wishes/wishes'
    };
    if (type == 'album' || type == 'letter') {
      wx.switchTab({
        url: routes[type]
      });
    }
    wx.navigateTo({
      url: routes[type]
    });
  },

  previewPhoto(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.recentPhotos.map(photo => photo.url);
    wx.previewImage({
      current: url,
      urls: urls
    });
  },

  showLoveMessage() {
    const idx = Math.floor(Math.random() * this.data.loveMessages.length);
    wx.showToast({
      title: this.data.loveMessages[idx],
      icon: 'none',
      duration: 2500
    });
  },

  goToAlbum() {
    console.log('goToAlbum');

    wx.switchTab({
      url: '/pages/album/album'
    });
  },

  // 查看相册
  viewAlbum() {
    wx.navigateTo({
      url: '/pages/album/album'
    });
  },
  
  // 查看图片详情
  viewImage(e) {
    const index = e.currentTarget.dataset.index;
    const urls = this.data.moments.map(item => item.imageUrl);
    
    wx.previewImage({
      current: urls[index],
      urls: urls
    });
  },

  // 跳转到心情页面
  goToMood() {
    wx.navigateTo({
      url: '/pages/mood/mood'
    });
  },

  // 记录今日心情
  recordMood() {
    wx.navigateTo({
      url: '/pages/mood/record/record'
    });
  }
})