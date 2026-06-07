const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.json());

const users = {}; // { username: password }
const activeSockets = {}; // { username: socketId }

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (users[username]) {
        return res.json({ success: false, message: "Bu kullanıcı adı zaten alınmış!" });
    }
    users[username] = password;
    res.json({ success: true, message: "Kayıt başarılı!" });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        return res.json({ success: true, message: "Giriş başarılı!" });
    }
    res.json({ success: false, message: "Kullanıcı adı veya şifre hatalı!" });
});

io.on('connection', (socket) => {
    let currentConnectedUser = "";

    // Kullanıcı online olduğunda onu kaydet
    socket.on('user online', (username) => {
        currentConnectedUser = username;
        activeSockets[username] = socket.id;
        // Herkese güncel aktif kullanıcı listesini gönder
        io.emit('update user list', Object.keys(activeSockets));
    });

    // Birebir Özel Mesaj Gönderme Sistemi
    socket.on('private message', ({ to, text, from }) => {
        const targetSocketId = activeSockets[to];
        const messageData = { from, text, to };

        // Mesajı gönderen kişiye geri yansıt (kendi ekranında görmek için)
        socket.emit('receive private message', messageData);

        // Eğer alıcı online ise mesajı ona ilet
        if (targetSocketId) {
            io.to(targetSocketId).emit('receive private message', messageData);
        }
    });

    // Kullanıcı uygulamayı kapattığında
    socket.on('disconnect', () => {
        if (currentConnectedUser) {
            delete activeSockets[currentConnectedUser];
            io.emit('update user list', Object.keys(activeSockets));
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});