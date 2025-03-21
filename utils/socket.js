const app = getApp()
 const socket  = wx.connectSocket({
    url: "wss://www.hyznb.cn/szglyzt_socket?id="+18623286610,
    header: { //请求头
        'content-type': 'application/json',
    },
    timeout: 7000,
    success: (res) => {
        console.log("websocket连接成功", res);
        
    },
    fail: (err) => {
        if (err) {
            console.log("wx.connectSocket连接失败", err)
        }
    },
    complete: (aa) => {
        console.log(aa);
        
        // console.log("websocke连接完成")
    }
});
console.log(socket);



socket.onOpen(() => {
    socket.send({
        data: 'hello'
    })
})


socket.onMessage(receiveMsg)

function receiveMsg(msg) {
    console.log(msg);
    app.globalData.hh = 'lllll'
}

module.exports = {
  socket,
}