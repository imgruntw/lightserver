const ls = require('./lightserver.js')

const server = new ls.LightServer('localhost', 9090, 'public');

server.addRoute(new ls.Route('/request', 'GET', (req, res) => {
    let data = {
        "key": "random number",
        "value": Math.random()
    };
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
}));

server.start();
