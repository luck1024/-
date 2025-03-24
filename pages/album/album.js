const db = wx.cloud.database();
const _ = db.command;
const app = getApp();
Page({
  data: {
    albums: [],
    loading: false,
    page: 1,
    currentCategory: 0,
    pageSize: 10,
    hasMore: true,
    list: [],
    categories: ['全部', '约会', '旅行', '日常', '纪念日']
  },

  onLoad() {
    // this.getAlbumList();
  },

  onPullDownRefresh() {
    this.setData({
      albums: [],
      page: 1,
      hasMore: true
    });
    this.getAlbumList().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShow() {
    this.getAlbumList();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreAlbums();
    }
  },
  filterPhotos() {
    const { list, currentCategory, categories } = this.data;
    const selectedCategory = categories[currentCategory];
  
    // 如果选择了"全部"分类，则显示所有照片
    if (selectedCategory === '全部') {
      this.setData({
        albums: list
      });
      return;
    }
    
    // 否则，筛选出包含所选分类的照片
    const filtered = list.filter(album => {
      // 检查照片的标签数组是否包含所选分类
      return list.tags && list.tags.includes(selectedCategory);
    });
    
    this.setData({
      albums: filtered
    });
  },

  switchCategory(e) {
    const { index } = e.currentTarget.dataset;
    
    this.setData({
      currentCategory: index
    }, () => {
      this.filterPhotos();
    });
  },

  previewImage(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.url,
      urls: [e.currentTarget.dataset.url]
    });
  },

  uploadPhoto() {
    // 过滤掉"全部"选项
    const categories = this.data.categories.slice(1);
    
    wx.showActionSheet({
      itemList: categories,
      success: (res) => {
        const selectedCategory = categories[res.tapIndex];
        
        // 选择完分类后再选择图片
        wx.chooseImage({
          count: 1, // 一次只上传一张
          sizeType: ['compressed'], // 压缩图片
          sourceType: ['album', 'camera'], // 来源
          success: async (imageRes) => {
            try {
              wx.showLoading({ title: '正在上传...' });
              
              const tempFilePath = imageRes.tempFilePaths[0];
              
              // 上传图片到云存储
              const uploadResult = await wx.cloud.uploadFile({
                cloudPath: `album/${Date.now()}-${Math.random().toString(36).substring(2)}.${tempFilePath.match(/\.(\w+)$/)[1]}`,
                filePath: tempFilePath
              });
              
              console.log('图片上传成功:', uploadResult);
              
              // 弹出输入框让用户输入标题和描述
              wx.hideLoading();
              
              wx.showModal({
                title: '添加照片信息',
                editable: true,
                placeholderText: '请输入照片标题',
                success: async (modalRes) => {
                  if (modalRes.confirm) {
                    const title = modalRes.content || '未命名照片';
                    
                    try {
                      wx.showLoading({ title: '保存中...' });
                      
                      // 直接使用数据库添加记录
                      const addResult = await db.collection('albums').add({
                        data: {
                          title: title,
                          description: '',
                          location: '',
                          imageUrl: uploadResult.fileID,
                          tags: [selectedCategory],
                          createTime: db.serverDate()
                        }
                      });
                      
                      console.log('保存照片结果:', addResult);
                      
                      wx.hideLoading();
                      
                      if (addResult._id) {
                        wx.showToast({
                          title: '上传成功',
                          icon: 'success'
                        });
                        
                        // 刷新相册列表
                        this.getAlbumList();
                      } else {
                        wx.showToast({
                          title: '保存失败',
                          icon: 'none'
                        });
                      }
                    } catch (err) {
                      wx.hideLoading();
                      console.error('保存照片失败:', err);
                      wx.showToast({
                        title: '保存失败: ' + err.message,
                        icon: 'none'
                      });
                    }
                  }
                }
              });
            } catch (err) {
              wx.hideLoading();
              console.error('上传图片失败:', err);
              wx.showToast({
                title: '上传失败: ' + err.message,
                icon: 'none'
              });
            }
          },
          fail: (err) => {
            console.error('选择图片失败:', err);
          }
        });
      },
      fail: (err) => {
        console.error('选择分类失败:', err);
      }
    });
  },

  // 长按照片处理
  handleLongPress(e) {
    const { id, url } = e.currentTarget.dataset;
    wx.showActionSheet({
      itemList: ['编辑位置', '删除照片'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0: // 编辑位置
            this.editLocation(id);
            break;
          case 1: // 删除照片
            this.deletePhoto(id);
            break;
        }
      }
    });
  },

  // 编辑位置
  editLocation(photoId) {
    wx.chooseLocation({
      success: (res) => {
        const updatedPhotos = this.data.photos.map(photo => {
          if (photo.id === photoId) {
            return { 
              ...photo, 
              location: res.name || res.address || '未知位置'
            };
          }
          return photo;
        });

        this.setData({
          photos: updatedPhotos
        }, () => {
          // 更新筛选后的照片和本地存储
          this.filterPhotos();
          wx.setStorageSync('albumPhotos', updatedPhotos);
          wx.showToast({
            title: '位置已更新',
            icon: 'success'
          });
        });
      },
      fail: (err) => {
        console.error('选择位置失败：', err);
        wx.showToast({
          title: '位置更新失败',
          icon: 'error'
        });
      }
    });
  },

  // 删除照片
  async deletePhoto(e) {
    console.log(e);
    const id = e
    
    try {
      const res = await wx.showModal({
        title: '确认删除',
        content: '确定要删除这张照片吗？',
        confirmColor: '#ff4d4f'
      });
      
      if (res.confirm) {
        wx.showLoading({ title: '正在删除...' });
        
        // 从数据库中删除照片
        await db.collection('albums').doc(id).remove();
        
        // 更新本地数据
        const updatedAlbums = this.data.albums.filter(album => album._id !== id);
        console.log(updatedAlbums);
        this.setData({
          albums: updatedAlbums
        });
        
        wx.hideLoading();
        
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('删除照片失败:', err);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  // 添加编辑照片信息的方法
  editPhotoInfo(e) {
    const id = e.currentTarget.dataset._id;
    console.log(id);

    wx.showActionSheet({
      itemList: ['编辑位置', '编辑分类'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0: // 编辑位置
            this.editLocation(id);
            break;
          case 1: // 编辑分类
            this.editCategory(id);
            break;
        }
      }
    });
  },

  // 编辑分类
  editCategory(photoId) {
    const categories = this.data.categories.filter(cat => cat !== '全部');
    wx.showActionSheet({
      itemList: categories,
      success: (res) => {
        const newCategory = categories[res.tapIndex];
        const updatedPhotos = this.data.photos.map(photo => {
          if (photo.id === photoId) {
            return { ...photo, category: newCategory };
          }
          return photo;
        });
        // 更新本地存储和页面数据
        wx.setStorageSync('albumPhotos', updatedPhotos);
        this.setData({ photos: updatedPhotos });
      }
    });
  },

  // 格式化时间
  formatTime(dateTime) {
    if (!dateTime) return '';
    
    const date = new Date(dateTime);
    const now = new Date();
    const diff = now - date; // 时间差（毫秒）
    
    // 今天的日期（0点）
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // 昨天的日期
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 小于1分钟
    if (diff < 60 * 1000) {
      return '刚刚';
    }
    // 小于1小时
    else if (diff < 60 * 60 * 1000) {
      return Math.floor(diff / (60 * 1000)) + '分钟前';
    }
    // 小于24小时
    else if (diff < 24 * 60 * 60 * 1000) {
      return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
    }
    // 昨天
    else if (date >= yesterday) {
      return '昨天 ' + date.getHours().toString().padStart(2, '0') + ':' + 
             date.getMinutes().toString().padStart(2, '0');
    }
    // 今年内
    else if (date.getFullYear() === now.getFullYear()) {
      return (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + 
             date.getHours().toString().padStart(2, '0') + ':' + 
             date.getMinutes().toString().padStart(2, '0');
    }
    // 更早
    else {
      return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + 
             date.getHours().toString().padStart(2, '0') + ':' + 
             date.getMinutes().toString().padStart(2, '0');
    }
  },

  // 处理相册数据，添加格式化的时间
  processAlbumData(albums) {
    return albums.map(album => {
      return {
        ...album,
        formattedTime: this.formatTime(album.createTime)
      };
    });
  },

  // 获取相册列表
  async getAlbumList() {
    if (this.data.loading) return;
    
    try {
      this.setData({ loading: true });
      
      // 从全局获取用户OpenID
      const openid = app.globalData.openid;
      if (!openid) {
        console.error('未获取到 openid');
        return;
      }

      // 获取用户信息
      const userInfo = wx.getStorageSync('userData');
      if (!userInfo) {
        console.error('未找到用户信息');
        return;
      }

      // 构建查询条件
      let query = {};
      
      if (userInfo.partnerId) {
        // 如果有伴侣，获取两个人的照片
        query = {
          _openid: _.in([openid, userInfo.partnerId])
        };
      } else {
        // 没有伴侣，只获取自己的照片
        query = {
          _openid: openid
        };
      }
      
      const result = await db.collection('albums')
        .where(query)
        .orderBy('createTime', 'desc')
        .limit(this.data.pageSize)
        .get();
      
      console.log(result.data);
      // 处理时间格式
      const processedAlbums = this.processAlbumData(result.data);
      this.data.list = processedAlbums;
      this.setData({
        albums: processedAlbums,
        hasMore: result.data.length === this.data.pageSize
      }, () => {
        // 筛选照片
        this.filterPhotos();
      });
      
    } catch (err) {
      console.error('获取相册列表失败:', err);
      wx.showToast({
        title: '获取相册失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载更多相册
  async loadMoreAlbums() {
    if (this.data.loading || !this.data.hasMore) return;
    
    try {
      this.setData({ loading: true });
      
      const nextPage = this.data.page + 1;
      const skip = (nextPage - 1) * this.data.pageSize;
      
      // 从全局获取用户OpenID
      const openid = app.globalData.openid;
      if (!openid) {
        console.error('未获取到 openid');
        return;
      }
      
      // 获取用户信息
      const userInfo = wx.getStorageSync('userData');
      if (!userInfo) {
        console.error('未找到用户信息');
        return;
      }

      // 构建查询条件
      let query = {};
      
      if (userInfo.partnerId) {
        // 如果有伴侣，获取两个人的照片
        query = {
          _openid: _.in([openid, userInfo.partnerId])
        };
      } else {
        // 没有伴侣，只获取自己的照片
        query = {
          _openid: openid
        };
      }
      
      const result = await db.collection('albums')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(this.data.pageSize)
        .get();
      
      // 处理时间格式
      const processedAlbums = this.processAlbumData(result.data);
      
      this.setData({
        albums: [...this.data.albums, ...processedAlbums],
        page: nextPage,
        hasMore: result.data.length === this.data.pageSize
      });
      
    } catch (err) {
      console.error('获取更多相册失败:', err);
      wx.showToast({
        title: '获取更多相册失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载照片
  async loadPhotos() {
    try {
      this.setData({ isLoading: true });
      
      const openid = app.globalData.openid;
      if (!openid) {
        console.error('未获取到 openid');
        return;
      }

      // 获取用户信息
      const userInfo = wx.getStorageSync('userData');
      if (!userInfo) {
        console.error('未找到用户信息');
        return;
      }

      // 构建查询条件
      const db = wx.cloud.database();
      const _ = db.command;
      let query = {};
      
      if (userInfo.partnerId) {
        // 如果有伴侣，获取两个人的照片
        query = {
          _openid: _.in([openid, userInfo.partnerId])
        };
      } else {
        // 没有伴侣，只获取自己的照片
        query = {
          _openid: openid
        };
      }

      // 查询照片数据
      const photosResult = await db.collection('photos')
        .where(query)
        .orderBy('createTime', 'desc')
        .get();

      // 处理照片数据，保持原有的数据结构
      const photos = photosResult.data;

      this.setData({
        photos,
        isLoading: false
        // 保持其他数据不变
      });

    } catch (err) {
      console.error('加载照片失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    }
  }
}); 