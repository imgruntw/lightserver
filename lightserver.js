const http = require('http');
const zlib = require('zlib');
const url = require('url');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = { 
    LightServer: class LightServer {
        constructor(host, port, staticDir) {
            this.host = host;
            this.port = port;
            this.staticDir = staticDir;

            this.contentTypes = this.createContentTypes();
            this.server = this.createServer();
            this.routes = [];
        }

        addRoute(route) {
            this.routes.push(route);
        }

        start() {
            this.server.listen(this.port, this.host, () => {
                this.logServerInfo();
            });
        }

        createServer() {
            return http.createServer((req, res) => {
                const uri = url.parse(req.url).pathname;
                const route = this.routes.find((r) => r.path === uri && r.method === req.method);

                console.log(`requested URI: ${uri}`);

                if (route === undefined) {
                    let fileName = path.join(`${__dirname}/${this.staticDir}`, uri);
                    this.handleFile(fileName, res);
                }
                else {
                    route.receive(req, res);
                }
            });
        }

        handleFile(fileName, res) {
            fs.exists(fileName, (exists) => {
                if (exists) {
                    if (fs.statSync(fileName).isDirectory()) {
                        const fallbackFileName = path.join(`${__dirname}/${this.staticDir}`, 'index.html');
                        fs.exists(fallbackFileName, (exists) => {
                            if (exists) {
                                this.readFile(fallbackFileName, res);
                            }
                            else {
                                this.createClientErrorResponse(res, `${fallbackFileName} not exist`);
                            }
                        });
                    }
                    else {
                        this.readFile(fileName, res);
                    }
                }
                else {
                    this.createClientErrorResponse(res, `${fileName} not exist`);
                }
            });
        }

        readFile(fileName, res) {
            fs.readFile(fileName, 'binary', (err, file)  => {
                if (err) {
                    this.createServerErrorResponse(res, err);
                }
                else {
                    let contentType = this.contentTypes[path.extname(fileName)];

                    if (contentType) {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', contentType);
                        res.end(file, 'binary');
                    }
                    else {
                        createServerErrorResponse(res, `unknown file extension: ${path.extname(fileName)}`);
                    }
                }
            });
        }

        createClientErrorResponse(res, msg) {
            res.statusCode = 400;
            res.setHeader('Content-Type', this.contentTypes['.txt']);
            res.end(msg);
        }

        createServerErrorResponse(res, msg) {
            res.statusCode = 500;
            res.setHeader('Content-Type', this.contentTypes['.txt']);
            res.end(msg);
        }

        createContentTypes() {
            return {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'application/javascript',
                '.json': 'application/json',
                '.txt': 'text/plain'
            };
        }

        logServerInfo() {
            console.log(`Server running at http://${this.host}:${this.port}/`);
            console.log(`${os.arch()} Architecture`);
            console.log(os.cpus()[0].model);
            console.log(`${os.cpus().length} cores`);
            console.log(`Speed: ${os.cpus()[0].speed} MHz`);
            console.log(`RAM: ${os.totalmem() / 1073741824} GB`);
            console.log(`OS: ${os.platform()} - ${os.type()}`);
        }
    },

    Route: class Route {
        constructor(path, method, handler) {
            this.path = path;
            this.method = method;
            this.handler = handler;
        }

        receive(req, res) {
            this.handler(req, res);
        }
    },

    Request: class Request {
        constructor(host, port, path, method, handler) {
            this.host = host;
            this.port = port;
            this.path = path;
            this.method = method;
            this.handler = handler;
        }

        send() {
            var options = {
                hostname: this.host,
                port: this.port,
                path: this.path,
                method: this.method
            };

            let req = http.request(options, (res) => {
                console.log(`response status: ${res.statusCode}`);

                let content = '';

                if (res.headers['content-encoding'] == 'gzip') {
                    let gunzip = zlib.createGunzip();
                    res.pipe(gunzip);
                    gunzip.on('data', (chunk) => {
                        content += chunk;
                    });
                    gunzip.on('end', () => {
                        this.handler(content);
                    });
                }
                else {
                    res.on('data', (chunk) => {
                        content += chunk;
                    });
                    res.on('end', () => {
                        this.handler(content);
                    });
                }
            });
            req.on('error', (err) => {
                console.log(`request error occured: ${err.message}`);
            });
            req.end();
        }
    }
}
