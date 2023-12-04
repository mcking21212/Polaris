import { createBareServer } from '@tomphttp/bare-server-node';
import express from 'express';
import mime from 'mime';
import cors from 'cors';

import { pathToFile, TokenManager, rewriter } from './utils.js';
import config from '../config.js';

import path from 'node:path';
import http from 'node:http';
import url from 'node:url';
import fs from 'node:fs';

const app = express();
const server = http.createServer();
const bareServer = createBareServer('/bare/');
const port = process.env.PORT || process.argv[2] || 8080;
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

app.get('/cdn/*', cors({
    origin: false
}), async (req, res, next) => {
    let reqTarget = `https://raw.githubusercontent.com/Skoolgq/Polaris-Assets/main/${req.path.replace('/cdn/', '')}`;

    const asset = await fetch(reqTarget);
    if (asset.status == 200) {
        var data = Buffer.from(await asset.arrayBuffer());

        const noRewrite = ['.unityweb'];
        if (!noRewrite.includes(mime.getExtension(reqTarget))) res.writeHead(200, {
            'content-type': mime.getType(reqTarget)
        });

        if (mime.getType(reqTarget) === 'text/html') data = data + '<script src=\'/assets/js/cdn_inject.js\' preload=\'true\'></script>';

        res.end(data);
    } else next();
});

app.get('/asset', (req, res, next) => {
    if (req.query.asset) {
        const {
            exists,
            path: filePath
        } = pathToFile(req.query.asset, path.join(__dirname, '../static/assets'));

        if (exists) {
            if (filePath.startsWith(path.join(__dirname, '../static/assets'))) res.setHeader('content-type', mime.getType(filePath)).end(fs.readFileSync(filePath));
            else next();
        } else next();
    } else next();
});

app.get('/asset/:token', async (req, res, next) => {
    if (req.params.token && !req.query.asset) {
        if (TokenManager.exists(req.params.token)) {
            const token = TokenManager.get(req.params.token);

            if (TokenManager.get(req.params.token).type === 'asset') {
                TokenManager.delete(req.params.token);

                res.setHeader('content-type', token.data.type);
                res.end(await rewriter.auto(fs.readFileSync(token.data.asset), token.data.type));
            } else next();
        } else next();
    }
});

app.get('/uv/*', (req, res) => res.setHeader('Service-Worker-Allowed', 'true'));

app.use(async (req, res, next) => {
    const {
        exists,
        path: filePath
    } = pathToFile(req.path, path.join(__dirname, '../static'));

    if (exists) {
        res.setHeader('content-type', mime.getType(filePath));

        if (mime.getType(filePath) === 'text/html') res.end(await rewriter.html(fs.readFileSync(filePath)));
        else if (mime.getType(filePath) === 'text/javascript') res.end(await rewriter.javascript(fs.readFileSync(filePath)));
        else if (mime.getType(filePath) === 'text/css') res.end(await rewriter.css(fs.readFileSync(filePath)));
        else res.sendFile(filePath);
    } else {
        res.setHeader('content-type', 'text/html');
        res.status(404).end(await rewriter.html(fs.readFileSync(path.join(__dirname, '../pages/404.html'))));
    }
});

server.on('request', (req, res) => {
    if (bareServer.shouldRoute(req)) bareServer.routeRequest(req, res);
    else app(req, res);
});

server.on('upgrade', (req, socket, head) => {
    if (bareServer.shouldRoute(req)) bareServer.routeUpgrade(req, socket, head);
    else socket.end();
});

server.listen(port, () => console.log(`Polaris started! http://localhost:${port}`));