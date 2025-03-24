const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    wishes: [],
    filteredWishes: [],
    showModal: false,
    newWish: '',
    note: '',
    dueDate: '',
    today: '',
    searchKeyword: '',
    categories: ['全部', '旅行', '美食', '纪念日', '购物', '其他'],
    selectedCategory: '全部',
    tags: ['旅行', '美食', '电影', '购物', '纪念日'],
    selectedTag: -1,
    priorities: [
      { text: '普通', class: 'normal' },
      { text: '重要', class: 'important' },
      { text: '紧急', class: 'urgent' }
    ],
    selectedPriority: 0,
    sortType: 'date',
    stats: {
      total: 0,
      completed: 0,
      urgent: 0
    },
    loading: false
  },

  onLoad() {
    const today = new Date();
    this.setData({
      today: today.toISOString().split('T')[0]
    });
    this.loadWishes();
  },

  onShow() {
    this.loadWishes();
  },

  async loadWishes() {
    try {
      this.setData({ loading: true });
      
      // 获取用户OpenID
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
      
      // 构建查询条件 - 只查询用户本人和伴侣的心愿
      let query = {};
      
      if (userInfo.partnerId) {
        // 如果有伴侣，获取两个人的心愿
        query = {
          _openid: _.in([openid, userInfo.partnerId])
        };
      } else {
        // 没有伴侣，只获取自己的心愿
        query = {
          _openid: openid
        };
      }
      
      // 查询心愿列表
      const result = await db.collection('wishes')
        .where(query)
        .orderBy('createTime', 'desc')
        .get();
      
      console.log('心愿列表:', result.data);
      
      this.setData({
        wishes: result.data,
        filteredWishes: result.data,
        loading: false
      });
      
      // 更新统计信息
      this.updateStats();
      
    } catch (err) {
      console.error('加载心愿列表失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  updateStats() {
    const wishes = this.data.wishes;
    const stats = {
      total: wishes.length,
      completed: wishes.filter(w => w.completed).length,
      urgent: wishes.filter(w => w.priority === 2).length
    };
    this.setData({ stats });
  },

  onSearch(e) {
    const keyword = e.detail.value.toLowerCase();
    this.setData({ searchKeyword: keyword });
    this.filterWishes();
  },

  filterByCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ selectedCategory: category });
    this.filterWishes();
  },

  filterWishes() {
    let wishes = [...this.data.wishes];
    const { searchKeyword, selectedCategory } = this.data;

    // 搜索过滤
    if (searchKeyword) {
      wishes = wishes.filter(wish => 
        wish.content.toLowerCase().includes(searchKeyword) ||
        wish.category.toLowerCase().includes(searchKeyword)
      );
    }

    // 分类过滤
    if (selectedCategory !== '全部') {
      wishes = wishes.filter(wish => wish.category === selectedCategory);
    }

    this.setData({ filteredWishes: wishes });
  },

  sortWishes(e) {
    const type = e.currentTarget.dataset.type;
    const wishes = [...this.data.filteredWishes];

    switch(type) {
      case 'date':
        wishes.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
        break;
      case 'priority':
        wishes.sort((a, b) => b.priority - a.priority);
        break;
      case 'completed':
        wishes.sort((a, b) => (a.completed === b.completed) ? 0 : a.completed ? 1 : -1);
        break;
    }

    this.setData({ 
      sortType: type,
      filteredWishes: wishes
    });
  },

  async toggleWish(e) {
    try {
      console.log(e);
      
      const id = e.currentTarget.dataset.id;
      
      // 获取当前心愿信息
      const wishIndex = this.data.wishes.findIndex(wish => wish._id === id);
      if (wishIndex === -1) return;
      
      const wish = this.data.wishes[wishIndex];
      const completed = !wish.completed;
      
      // 更新数据库中的完成状态
      await db.collection('wishes').doc(id).update({
        data: {
          completed: completed,
          completedAt: completed ? db.serverDate() : null,
          updateTime: db.serverDate()
        }
      });
      
      // 更新本地数据
      const wishes = this.data.wishes.map(w => {
        if (w._id === id) {
          return {
            ...w,
            completed: completed,
            completedAt: completed ? new Date() : null
          };
        }
        return w;
      });
      
      this.setData({ wishes });
      this.filterWishes();
      this.updateStats();
      
      wx.showToast({
        title: completed ? '已完成' : '已取消完成',
        icon: 'success'
      });
      
    } catch (err) {
      console.error('更新心愿状态失败:', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  async deleteWish(e) {
    try {
      const id = e.currentTarget.dataset.id;
      
      // 获取心愿详情以检查权限
      const wishResult = await db.collection('wishes').doc(id).get();
      const wish = wishResult.data;
      
      // 获取用户信息
      const openid = app.globalData.openid;
      const userInfo = wx.getStorageSync('userData');
      
      // 检查是否为创建者或伴侣
      if (wish._openid !== openid && (!userInfo?.partnerId || wish._openid !== userInfo.partnerId)) {
        wx.showToast({
          title: '无权删除此心愿',
          icon: 'none'
        });
        return;
      }
      
      const res = await wx.showModal({
        title: '提示',
        content: '确定要删除这个心愿吗？',
        confirmColor: '#ff4d4f'
      });
      
      if (res.confirm) {
        // 从数据库中删除
        await db.collection('wishes').doc(id).remove();
        
        // 更新本地数据
        const wishes = this.data.wishes.filter(w => w._id !== id);
        this.setData({ wishes });
        this.filterWishes();
        this.updateStats();
        
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      }
    } catch (err) {
      console.error('删除心愿失败:', err);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  showAddModal() {
    this.setData({
      showModal: true,
      newWish: '',
      selectedTag: -1,
      selectedPriority: 0,
      dueDate: '',
      note: ''
    });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  onInput(e) {
    this.setData({ newWish: e.detail.value });
  },

  selectTag(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedTag: index });
  },

  selectPriority(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedPriority: index });
  },

  onDateChange(e) {
    this.setData({ dueDate: e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  async addWish() {
    try {
      const { newWish, selectedTag, tags, selectedPriority, dueDate, note } = this.data;
      
      if (!newWish.trim()) {
        wx.showToast({
          title: '请输入心愿内容',
          icon: 'none'
        });
        return;
      }
      
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
      
      wx.showLoading({ title: '添加中...' });
      
      // 构建心愿数据
      const wishData = {
        content: newWish.trim(),
        category: selectedTag !== -1 ? tags[selectedTag] : '其他',
        priority: selectedPriority,
        completed: false,
        dueDate: dueDate || null,
        note: note || null,
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
        partnerId: userInfo.partnerId || null
      };
      
      // 添加到数据库
      const result = await db.collection('wishes').add({
        data: wishData
      });
      
      if (result._id) {
        // 添加成功，更新本地数据
        const wishes = [{
          _id: result._id,
          ...wishData,
          createTime: new Date()
        }, ...this.data.wishes];
        
        this.setData({
          wishes,
          showModal: false
        });
        
        this.filterWishes();
        this.updateStats();
        
        wx.hideLoading();
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
      } else {
        throw new Error('添加失败');
      }
      
    } catch (err) {
      wx.hideLoading();
      console.error('添加心愿失败:', err);
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      });
    }
  }
}); 