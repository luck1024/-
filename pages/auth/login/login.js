const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    isLoading: false,
    inviteCode: '' // 存储可能的邀请码
  },

  onLoad(options) {
    console.log('Login page onLoad, options:', options);
    // 如果是从邀请链接进来的，保存邀请码
    if (options.code) {
      this.setData({
        inviteCode: options.code
      });
    }
  },

  async onShow() {
    const isLoggedIn = await app.checkSession();
    console.log('Login page onShow');
    if (isLoggedIn) {
      wx.redirectTo({
        url: '/pages/index/index',
        success: () => {
          console.log('跳转成功');
        }
      });
    }
  },

  // 获取用户信息
  async getUserProfile() {
        // 检查是否已同意协议
        if (!this.data.isAgreed) {
          wx.showToast({
            title: '请先同意用户协议和隐私政策',
            icon: 'none'
          });
          return;
        }
    try {
      console.log('开始获取用户信息');
      this.setData({ isLoading: true });
      
      // 1. 获取用户信息
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善用户资料'
      });
      
      // 2. 获取 openid
      const { result } = await wx.cloud.callFunction({
        name: 'login'
      });
      
      if (!result.openid) {
        throw new Error('获取 openid 失败');
      }

      app.globalData.openid = result.openid;
      
      // 3. 查询用户是否已存在
      const userResult = await db.collection('users').where({
        _openid: result.openid
      }).get();
      
      let userData = null;
      
      if (userResult.data.length === 0) {
        // 4. 用户不存在，创建新用户
        const userDoc = {
          _openid: result.openid, // 显式设置 openid
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          gender: userInfo.gender === 1 ? '男' : userInfo.gender === 2 ? '女' : '未知',
          country: userInfo.country || '',
          province: userInfo.province || '',
          city: userInfo.city || '',
          language: userInfo.language || '',
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          lastLoginTime: db.serverDate()
        };

        try {
          const addResult = await db.collection('users').add({
            data: userDoc
          });
          
          userData = {
            ...userDoc,
            _id: addResult._id
          };
        } catch (addErr) {
          // 如果添加失败，再次查询确认用户是否真的不存在
          const doubleCheck = await db.collection('users').where({
            _openid: result.openid
          }).get();
          
          if (doubleCheck.data.length > 0) {
            userData = doubleCheck.data[0];
            // 更新登录时间
            await db.collection('users').doc(userData._id).update({
              data: {
                lastLoginTime: db.serverDate()
              }
            });
          } else {
            throw addErr; // 如果确实不存在且添加失败，抛出错误
          }
        }
      } else {
        // 5. 用户已存在，只更新登录时间
        userData = userResult.data[0];
        await db.collection('users').doc(userData._id).update({
          data: {
            lastLoginTime: db.serverDate()
          }
        });
      }

      // 6. 保存用户信息到全局数据和本地存储
      app.globalData.userInfo = userData;
      wx.setStorageSync('userData', userData);

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
      
      // 7. 处理邀请码或跳转
      if (this.data.inviteCode) {
        console.log('有邀请码，准备跳转到接受邀请页面');
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/invite/accept/accept?code=${this.data.inviteCode}`,
            success: () => {
              console.log('跳转成功');
            },
            fail: (error) => {
              console.error('跳转失败:', error);
              wx.showToast({
                title: '页面跳转失败',
                icon: 'none'
              });
            }
          });
        }, 1500);
      } else {
        console.log('无邀请码，准备跳转到首页');
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index',
            success: () => {
              console.log('跳转成功');
            },
            fail: (error) => {
              console.error('跳转失败:', error);
              wx.showToast({
                title: '页面跳转失败',
                icon: 'none'
              });
            }
          });
        }, 1500);
      }
      
    } catch (err) {
      console.error('登录失败:', err);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },
  onChange(e) {
    this.setData({
      isAgreed: e.detail,
    });
  },
  // 查看用户协议
  viewAgreement() {
    wx.navigateTo({
      url: '/pages/auth/agreement/agreement'
    });
  },

  // 查看隐私政策
  viewPrivacy() {
    wx.navigateTo({
      url: '/pages/auth/privacy/privacy'
    });
  }
});