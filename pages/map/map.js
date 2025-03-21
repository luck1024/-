var coors;
// gao高德地图，
var amapFile = require('../../utils/amap-wx.130');
var key = "e2df28e03562d0005f890171153ea826"; //web服务key
Page({
  data: {
    polyline: [],
    markers: [],
    info: {},
    distance:'',
    cost:''
  },
  // 刷新页面
  intres(){
    console.log(1);
    // this.show()
  },
  onReady: function () {
    this.mapContext = wx.createMapContext("map", this);
  },
  onLoad: function (options) {
    // 获取当前地图，设置经纬度，传递过来的坐标，用户下单的坐标地址。
    console.log(options);
    var info = JSON.parse(options.info)
    console.log(info);
    this.setData({
      info: info
    })
    wx.getLocation({
       type: 'gcj02',
      altitude: true, //高精度定位
      isHighAccuracy:true,
      success: (res) => {
        console.log(res);
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude
        });
        this.getCenterLocation(res);
        wx.request({
          // url: 'https://apis.map.qq.com/ws/direction/v1/driving/?from=' + this.data.markers[0].latitude + ',' + this.data.markers[0].longitude + '&to=' + this.data.markers[1].latitude + ',' + this.data.markers[1].longitude + '&output=json&callback=cb&key=PD5BZ-K2VRO-CPEWZ-SOBAC-4KCDT-KAFLF',
          url: 'https://restapi.amap.com/v3/direction/walking?key=' + key + '&origin= ' + this.data.markers[0].longitude + ',' + this.data.markers[0].latitude + '&destination=' + this.data.markers[1].longitude + ',' + this.data.markers[1].latitude,
          success: (res) => {
            console.log(res);
            var points = [];
            var data = res.data.route
            // 运算坐标
            if (data.paths && data.paths[0] && data.paths[0].steps) {
              var steps = data.paths[0].steps;
              for (var i = 0; i < steps.length; i++) {
                var poLen = steps[i].polyline.split(';');
                for (var j = 0; j < poLen.length; j++) {
                  points.push({
                    longitude: parseFloat(poLen[j].split(',')[0]),
                    latitude: parseFloat(poLen[j].split(',')[1])
                  })
                }
              }
            }
            console.log(points);
            this.setData({
              state: 1,
              polyline: [{
              points: points,
              color: "#0091ff",
              width: 10,
              arrowLine:true
              }]
             });
             if (data.paths[0] && data.paths[0].distance) {
              this.setData({
              distance: data.paths[0].distance + '米'
              });
              console.log(this.data.distance);
             }
             if (data.taxi_cost) {
              this.setData({
              cost: '打车约' + parseInt(data.taxi_cost) + '元'
              });
              console.log(this.data.cost);
             }
          }
        })
      }
    });
  },
  //  两个坐标 一个自生位置，一个目的地
  getCenterLocation: function (res) {
    console.log(res);
    console.log(this.data.info); //目的地
    this.setData({
      markers: [{
          iconPath: "../../image/我的位置.png",
          id: 0,
          latitude: res.latitude,
          longitude: res.longitude,
          width: 30,
          height: 30,
          alpha: 0.8,
          callout: {
            content: " 我的位置 ",
            color: "#ffffff",
            fontSize: 10,
            borderRadius: 10,
            bgColor: "#6e707c",
            padding: 5,
            display: "ALWAYS"
          }
        },
        {
          iconPath: "../../image/位置目的地.png",
          id: 1,
          latitude: this.data.info.lat2,
          longitude: this.data.info.lng2,
          width: 30,
          height: 30,
          alpha: 0.8,
          callout: {
            content: " 目的地 ",
            color: "#ffffff",
            fontSize: 10,
            borderRadius: 10,
            bgColor: "#6e707c",
            padding: 5,
            display: "ALWAYS"
          }
        }
      ],
    });
  },
});